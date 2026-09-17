import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { ProductCard } from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/SkeletonLoader';
import { triggerHaptic } from '../../utils/haptics';
import { useCart, getItemProductId } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { favoritesService } from '../../services/favoritesService';

const { width } = Dimensions.get('window');

type SortOption = 'default' | 'price_low' | 'price_high' | 'newest';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'default', label: 'Relevance' },
  { id: 'price_low', label: 'Price: Low to High' },
  { id: 'price_high', label: 'Price: High to Low' },
  { id: 'newest', label: 'Newest' },
];

type CacheEntry = {
  products: any[];
  nextUrl: string | null;
  timestamp: number;
};

// Module-level in-memory cache per section/category (TTL: 3 minutes)
const productSectionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

const getSectionCacheKey = (category: number | null, search: string, sort: SortOption) => {
  return `${category ?? 'all'}_${search.trim().toLowerCase()}_${sort}`;
};

let cachedCategories: any[] | null = null;

export function ProductListScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const initialCategoryId = route.params?.categoryId || null;
  const initialCategoryName = route.params?.categoryName || 'All Products';
  const initialSearch = route.params?.search || '';

  const { user } = useAuth();
  const { cart, addToCart, updateQuantity, cartQuantityMap } = useCart();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  
  const [categories, setCategories] = useState<any[]>(cachedCategories || []);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategoryId);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Favorites state synced via favoritesService
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(favoritesService.getFavoriteIds());
  const [favoriteMap, setFavoriteMap] = useState<Record<number, number>>(favoritesService.getFavoriteMap());

  const getOrderingParam = (sort: SortOption): string | undefined => {
    switch (sort) {
      case 'price_low':
        return 'offer_price';
      case 'price_high':
        return '-offer_price';
      case 'newest':
        return '-created_at';
      case 'default':
      default:
        return undefined;
    }
  };

  const fetchFavorites = useCallback(async (force = false) => {
    if (!user) {
      setFavoriteIds(new Set());
      setFavoriteMap({});
      return;
    }
    try {
      const snap = await favoritesService.getFavorites(force);
      setFavoriteIds(new Set(snap.ids));
      setFavoriteMap({ ...snap.map });
    } catch (err) {
      console.log('Error fetching favorites:', err);
    }
  }, [user]);

  const toggleFavorite = useCallback(async (param: any) => {
    const productId = typeof param === 'object' && param !== null ? param.id : Number(param);
    if (!productId) return;

    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save your favorite products.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    try {
      await favoritesService.toggleFavorite(productId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  }, [user, navigation]);

  useEffect(() => {
    if (user) {
      fetchFavorites();
      const unsubscribe = favoritesService.subscribe(() => {
        setFavoriteIds(new Set(favoritesService.getFavoriteIds()));
        setFavoriteMap({ ...favoritesService.getFavoriteMap() });
      });
      return unsubscribe;
    }
  }, [user, fetchFavorites]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const key = getSectionCacheKey(selectedCategory, searchQuery, sortOption);
    const cached = productSectionCache.get(key);

    if (cached) {
      // 0ms instant display from section cache! Zero skeleton flash!
      setProducts(cached.products);
      setHasMore(Boolean(cached.nextUrl));
      setPage(1);
      setLoading(false);

      // Silent background revalidation
      fetchProducts(1, true, true);
    } else {
      // First visit to this section
      fetchProducts(1, true, false);
    }
  }, [selectedCategory, searchQuery, sortOption]);

  const fetchCategories = async () => {
    if (cachedCategories && cachedCategories.length > 0) {
      setCategories(cachedCategories);
      return;
    }
    try {
      const res = await apiClient.get('/categories/');
      const cats = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      cachedCategories = cats;
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const fetchProducts = async (pageNum: number, isReset = false, isSilent = false) => {
    const key = getSectionCacheKey(selectedCategory, searchQuery, sortOption);

    if (isReset) {
      if (!isSilent) {
        setLoading(true);
      } else {
        setIsRevalidating(true);
      }
      setPage(1);
    }

    try {
      const params: any = { page: pageNum };
      if (selectedCategory) params.category = selectedCategory;
      if (searchQuery) params.search = searchQuery;

      const ordering = getOrderingParam(sortOption);
      if (ordering) params.ordering = ordering;

      const res = await apiClient.get('/products/', { params });
      const newItems = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const nextUrl = res.data?.next;

      if (isReset) {
        setProducts(newItems);
        productSectionCache.set(key, {
          products: newItems,
          nextUrl: nextUrl || null,
          timestamp: Date.now()
        });
      } else {
        setProducts(prev => {
          const updated = [...prev, ...newItems];
          productSectionCache.set(key, {
            products: updated,
            nextUrl: nextUrl || null,
            timestamp: Date.now()
          });
          return updated;
        });
      }
      setHasMore(Boolean(nextUrl));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      setIsRevalidating(false);
    }
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      setLoadingMore(true);
      fetchProducts(page + 1, false);
    }
  };

  const sortedProducts = products;

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);
  const activeCategoryName = selectedCategory 
    ? (activeCategoryObj?.name || initialCategoryName) 
    : (searchQuery ? `Search: "${searchQuery}"` : 'All Products');

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 310,
    offset: 310 * Math.floor(index / 2),
    index,
  }), []);

  const listHeaderElement = useMemo(() => (
    <View style={[styles.scrollableHeaderContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Horizontal Category Filter Pills matching web app */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.categoryPillsContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryPill, 
            { backgroundColor: colors.inputBg, borderColor: colors.border },
            !selectedCategory && styles.categoryPillActive
          ]}
          onPress={() => {
            triggerHaptic('selection');
            setSelectedCategory(null);
          }}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.categoryPillText, 
            { color: colors.textSecondary },
            !selectedCategory && styles.categoryPillTextActive
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryPill, 
                { backgroundColor: colors.inputBg, borderColor: colors.border },
                isSelected && styles.categoryPillActive
              ]}
              onPress={() => {
                triggerHaptic('selection');
                setSelectedCategory(cat.id);
              }}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.categoryPillText, 
                { color: colors.textSecondary },
                isSelected && styles.categoryPillTextActive
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Title & Count */}
      <View style={[styles.subHeaderRow, { borderTopColor: colors.border }]}>
        <Text style={[styles.categoryTitle, { color: colors.text }]}>{activeCategoryName}</Text>
        <Text style={[styles.productCountText, { color: colors.textSecondary }]}>{sortedProducts.length} products</Text>
      </View>

      {/* Sorting Pills: Relevance, Price: Low to High, Price: High to Low, Newest */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.categoryPillsContainer}
      >
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[
              styles.sortChip, 
              { backgroundColor: colors.inputBg, borderColor: colors.border },
              sortOption === opt.id && [styles.sortChipActive, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: colors.primary }]
            ]}
            onPress={() => {
              triggerHaptic('selection');
              setSortOption(opt.id);
            }}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.sortChipText, 
              { color: colors.textSecondary },
              sortOption === opt.id && [styles.sortChipTextActive, isDark && { color: colors.primary }]
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  ), [colors, isDark, selectedCategory, categories, activeCategoryName, sortedProducts.length, sortOption]);

  const handleProductPress = useCallback((item: any) => {
    navigation.navigate('ProductDetailScreen', { productId: item.id, initialProduct: item });
  }, [navigation]);

  const handleAddToCart = useCallback((p: any) => {
    addToCart(p.id, 1, p);
  }, [addToCart]);

  const handleUpdateQuantity = useCallback((productId: number, newQty: number) => {
    const item = cart?.items?.find((i: any) => getItemProductId(i) === productId);
    if (item) {
      updateQuantity(item.id, newQty);
    } else if (newQty > 0) {
      addToCart(productId, newQty);
    }
  }, [cart, updateQuantity, addToCart]);

  const handleToggleFavorite = useCallback((p: any) => {
    toggleFavorite(p?.id ?? p);
  }, [toggleFavorite]);

  const renderProductItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.cardWrapper}>
      <ProductCard 
        product={item} 
        onPress={handleProductPress} 
        onAddToCart={handleAddToCart}
        onUpdateQuantity={handleUpdateQuantity}
        cartQty={cartQuantityMap[item.id] || 0}
        isFavorite={favoriteIds.has(item.id)}
        onToggleFavorite={handleToggleFavorite}
      />
    </View>
  ), [handleProductPress, handleAddToCart, handleUpdateQuantity, cartQuantityMap, favoriteIds, handleToggleFavorite]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Compact Top Bar: Fixed Back Button & Category Name */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('HomeTab');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>{t('back')}</Text>
        </TouchableOpacity>

        <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
          {activeCategoryName}
        </Text>

        <View style={[styles.topBarBadge, isDark && { backgroundColor: colors.inputBg }]}>
          {isRevalidating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.topBarBadgeText, { color: colors.primary }]}>{sortedProducts.length}</Text>
          )}
        </View>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {listHeaderElement}
          <View style={styles.row}>
            <View style={styles.cardWrapper}><ProductCardSkeleton /></View>
            <View style={styles.cardWrapper}><ProductCardSkeleton /></View>
          </View>
          <View style={styles.row}>
            <View style={styles.cardWrapper}><ProductCardSkeleton /></View>
            <View style={styles.cardWrapper}><ProductCardSkeleton /></View>
          </View>
          <View style={styles.row}>
            <View style={styles.cardWrapper}><ProductCardSkeleton /></View>
            <View style={styles.cardWrapper}><ProductCardSkeleton /></View>
          </View>
        </ScrollView>
      ) : sortedProducts.length === 0 ? (
        <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
          {listHeaderElement}
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9' }]}>
              <Feather name="package" size={40} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noProductsFound')}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {selectedCategory !== null || !!searchQuery
                ? 'No products match your selected filters. Tap below to see all items.'
                : 'There are no products available in this category right now.'}
            </Text>
            <TouchableOpacity 
              style={styles.clearFiltersBtn}
              onPress={() => {
                triggerHaptic('selection');
                setSelectedCategory(null);
                setSearchQuery('');
                setSortOption('default');
              }}
              activeOpacity={0.8}
            >
              <Feather name="refresh-cw" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.clearFiltersBtnText}>{t('clearFilters')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item, index) => String(item?.id ?? index)}
          numColumns={2}
          ListHeaderComponent={listHeaderElement}
          getItemLayout={getItemLayout}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            const key = getSectionCacheKey(selectedCategory, searchQuery, sortOption);
            productSectionCache.delete(key);
            fetchProducts(1, true, false);
            fetchFavorites(true);
          }}
          renderItem={renderProductItem}
          initialNumToRender={6}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          updateCellsBatchingPeriod={50}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            loadingMore ? (
              <ActivityIndicator style={{ margin: 20 }} color="#059669" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 55,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  topBarBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },
  topBarBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  scrollableHeaderContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginHorizontal: -12,
  },
  categoryPillsContainer: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  productCountText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  sortScrollContainer: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sortChipActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  sortChipTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 18,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  clearFiltersBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  cardWrapper: {
    width: Math.floor((width - 36) / 2),
  },
});
