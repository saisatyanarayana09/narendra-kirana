import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';

const { width } = Dimensions.get('window');

type SortOption = 'default' | 'price_low' | 'price_high' | 'newest';

export function ProductListScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const initialCategoryId = route.params?.categoryId || null;
  const initialCategoryName = route.params?.categoryName || 'All Products';
  const initialSearch = route.params?.search || '';

  const { addToCart } = useCart();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategoryId);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts(1, true);
  }, [selectedCategory, initialSearch]);

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categories/');
      setCategories(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const fetchProducts = async (pageNum: number, isReset = false) => {
    if (isReset) {
      setLoading(true);
      setPage(1);
    }

    try {
      const params: any = { page: pageNum };
      if (selectedCategory) params.category = selectedCategory;
      if (initialSearch) params.search = initialSearch;

      const res = await apiClient.get('/products/', { params });
      const newItems = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const nextUrl = res.data?.next;

      if (isReset) {
        setProducts(newItems);
      } else {
        setProducts(prev => [...prev, ...newItems]);
      }
      setHasMore(Boolean(nextUrl));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      setLoadingMore(true);
      fetchProducts(page + 1, false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const priceA = parseFloat(a.offer_price || a.price || a.regular_price || '0');
    const priceB = parseFloat(b.offer_price || b.price || b.regular_price || '0');
    if (sortOption === 'price_low') return priceA - priceB;
    if (sortOption === 'price_high') return priceB - priceA;
    if (sortOption === 'newest') return b.id - a.id;
    return 0;
  });

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);
  const activeCategoryName = selectedCategory ? (activeCategoryObj?.name || initialCategoryName) : 'All Products';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web ProductsPage */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#059669" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {/* Horizontal Category Filter Pills matching web app */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.categoryPillsContainer}
        >
          <TouchableOpacity
            style={[styles.categoryPill, !selectedCategory && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.categoryPillText, !selectedCategory && styles.categoryPillTextActive]}>
              All
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Category Title & Sort Row */}
        <View style={styles.subHeaderRow}>
          <View>
            <Text style={styles.categoryTitle}>{activeCategoryName}</Text>
            <Text style={styles.productCountText}>{sortedProducts.length} products</Text>
          </View>

          {/* Quick Sort Options Chips */}
          <View style={styles.sortChipsRow}>
            {(['default', 'price_low', 'price_high'] as SortOption[]).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.sortChip, sortOption === opt && styles.sortChipActive]}
                onPress={() => setSortOption(opt)}
                activeOpacity={0.8}
              >
                <Text style={[styles.sortChipText, sortOption === opt && styles.sortChipTextActive]}>
                  {opt === 'default' ? 'Relevance' : opt === 'price_low' ? 'Price: Low' : 'Price: High'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : sortedProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Feather name="package" size={40} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySubtitle}>
            There are no products in this category right now. Please check another aisle!
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchProducts(1, true);
          }}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <ProductCard 
                product={item} 
                onPress={() => navigation.navigate('ProductDetailScreen', { productId: item.id })} 
                onAddToCart={(p) => addToCart(p.id, 1)}
              />
            </View>
          )}
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
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingTop: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  categoryPillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  sortChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  sortChipActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  sortChipText: {
    fontSize: 10,
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
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardWrapper: {
    width: (width - 44) / 2,
  },
});
