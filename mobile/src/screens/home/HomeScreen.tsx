import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  Dimensions,
  FlatList
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ProductCard } from '../../components/ProductCard';
import { CategoryCard } from '../../components/CategoryCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { BannerSkeleton, ProductCardSkeleton, SkeletonItem } from '../../components/SkeletonLoader';
import { fixImageUrl } from '../../utils/image';

type Props = {
  navigation: AppNavigationProp;
};

const { width } = Dimensions.get('window');
const BANNER_HEIGHT = Math.min(180, Math.round((width * 7) / 16)); // aspect-[16/7] max-h-[180px] matching web

const stripEmojis = (str: string) => {
  if (!str) return '';
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F200}-\u{1F2FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu, '').trim();
};

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favoriteMap, setFavoriteMap] = useState<Record<number, number>>({});

  const bannerRef = useRef<FlatList>(null);
  const bannerFlatListRef = bannerRef;
  const carouselTimerRef = useRef<any>(null);

  const fetchFavorites = async () => {
    if (!user) {
      return;
    }
    try {
      const res = await apiClient.get('/favorites/').catch(() => ({ data: [] }));
      const items = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const ids = new Set<number>();
      const map: Record<number, number> = {};
      items.forEach((item: any) => {
        const pId = item.product?.id ?? item.product ?? item.product_details?.id;
        if (pId) {
          const numId = Number(pId);
          ids.add(numId);
          map[numId] = item.id;
        }
      });
      setFavoriteIds(ids);
      setFavoriteMap(map);
    } catch (error) {
      console.log('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (param: any) => {
    const productId = typeof param === 'object' && param !== null ? param.id : Number(param);
    if (!productId) return;

    if (!user) {
      // Local toggle for guests
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (next.has(productId)) next.delete(productId);
        else next.add(productId);
        return next;
      });
      return;
    }

    const isFav = favoriteIds.has(productId);
    const favId = favoriteMap[productId];

    // Optimistic UI update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(productId);
      else next.add(productId);
      return next;
    });

    try {
      if (isFav) {
        if (favId) {
          await apiClient.delete(`/favorites/${favId}/`).catch(() => 
            apiClient.post('/favorites/toggle/', { product: productId })
          );
        } else {
          await apiClient.post('/favorites/toggle/', { product: productId });
        }
        setFavoriteMap(prev => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      } else {
        const res = await apiClient.post('/favorites/', { product: productId });
        const newId = res.data?.id || res.data?.favorite?.id;
        if (newId) {
          setFavoriteMap(prev => ({ ...prev, [productId]: newId }));
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert on failure
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(productId);
        else next.delete(productId);
        return next;
      });
    }
  };

  const fetchHomeData = async () => {
    try {
      const [catsRes, bannersRes, sectionsRes, settingsRes] = await Promise.all([
        apiClient.get('/categories/').catch(() => ({ data: [] })),
        apiClient.get('/offers/banners/').catch(() => ({ data: [] })),
        apiClient.get('/store/homepage-sections/').catch(() => ({ data: [] })),
        apiClient.get('/store/settings/').catch(() => ({ data: {} })),
      ]);
      
      setCategories(Array.isArray(catsRes.data) ? catsRes.data : (catsRes.data?.results || []));
      setBanners(Array.isArray(bannersRes.data) ? bannersRes.data : (bannersRes.data?.results || []));
      
      const rawSections = Array.isArray(sectionsRes.data) ? sectionsRes.data : (sectionsRes.data?.results || []);
      const mappedSections = rawSections
        .map((sec: any) => ({
          ...sec,
          items: (sec.section_products || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((sp: any) => sp.product_details)
            .filter(Boolean)
        }))
        .filter((s: any) => s.is_active !== false)
        .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

      setSections(mappedSections);
      setSettings(settingsRes.data || {});
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
    fetchFavorites();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchFavorites();
    });
    return unsubscribe;
  }, [user, navigation]);

  const startCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current) {
      clearInterval(carouselTimerRef.current);
    }
    if (banners.length <= 1) return;
    carouselTimerRef.current = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        bannerRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
  }, [banners.length]);

  // Auto-scroll banners every 4 seconds
  useEffect(() => {
    startCarouselTimer();
    return () => {
      if (carouselTimerRef.current) {
        clearInterval(carouselTimerRef.current);
      }
    };
  }, [startCarouselTimer]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
    fetchFavorites();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandSlate}>Narendra </Text>
              <Text style={styles.brandRed}>Kirana</Text>
            </Text>
          </View>
          <View style={styles.searchBar}>
            <Feather name="search" size={16} color="#94A3B8" />
            <Text style={styles.searchPlaceholder}>Search products...</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <BannerSkeleton />
          
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <SkeletonItem width={120} height={18} borderRadius={6} style={{ marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonItem width={72} height={72} borderRadius={16} />
              <SkeletonItem width={72} height={72} borderRadius={16} />
              <SkeletonItem width={72} height={72} borderRadius={16} />
              <SkeletonItem width={72} height={72} borderRadius={16} />
            </View>
          </View>

          <View style={{ marginBottom: 16 }}>
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <SkeletonItem width={140} height={18} borderRadius={6} />
            </View>
            <View style={styles.horizontalProductsList}>
              <View style={styles.horizontalProductItem}><ProductCardSkeleton /></View>
              <View style={styles.horizontalProductItem}><ProductCardSkeleton /></View>
              <View style={styles.horizontalProductItem}><ProductCardSkeleton /></View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header matching Web App 1:1 in a single row */}
      <View style={styles.headerRow}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>
            <Text style={styles.brandSlate}>Narendra </Text>
            <Text style={styles.brandRed}>Kirana</Text>
          </Text>
        </View>

        {/* Inline Search Bar matching Web App */}
        <TouchableOpacity 
          style={styles.searchBar}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <Feather name="search" size={16} color="#94A3B8" />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>Search products...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#059669']} 
          />
        }
      >
        {/* Banner Carousel or Web Fallback Hero Banner */}
        {banners.length > 0 ? (
          <View style={styles.carouselWrapper}>
            <FlatList
              ref={bannerRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width}
              snapToAlignment="start"
              decelerationRate="fast"
              getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
              contentContainerStyle={styles.bannersList}
              keyExtractor={(item: any) => String(item.id)}
              onScrollBeginDrag={() => clearInterval(carouselTimerRef.current)}
              onScrollEndDrag={() => startCarouselTimer()}
              onScrollToIndexFailed={(info) => {
                setTimeout(() => bannerRef.current?.scrollToIndex({ index: info.index, animated: false }), 200);
              }}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActiveBannerIndex(index);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  activeOpacity={0.95}
                  style={styles.bannerSlide}
                  onPress={() => navigation.navigate('CategoriesTab', { screen: 'ProductListScreen', params: {} })}
                >
                  <Image 
                    source={{ uri: fixImageUrl(item.image) || '' }} 
                    style={styles.bannerImage} 
                    contentFit="cover"
                  />
                </TouchableOpacity>
              )}
            />

            {/* Carousel Dots matching web app */}
            {banners.length > 1 && (
              <View style={styles.dotsContainer}>
                {banners.map((_, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.dot, 
                      activeBannerIndex === idx && styles.activeDot
                    ]} 
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.fallbackHeroBanner}>
            {/* Decorative shapes and floating emojis matching web */}
            <View style={styles.heroDecorTopCircle} />
            <View style={styles.heroDecorBottomCircle} />
            <Text style={styles.heroFloatingEmojiCart}>🛒</Text>
            <Text style={styles.heroFloatingEmojiVeg}>🥬</Text>
            
            <View style={styles.heroInnerContent}>
              <View style={styles.heroTagPill}>
                <Feather name="star" size={11} color="#FDE047" />
                <Text style={styles.heroTagText}>
                  {settings?.store_name || 'NARENDRA KIRANA STORE'}
                </Text>
              </View>

              <Text style={styles.heroHeadline}>
                Everyday essentials, <Text style={styles.heroHeadlineYellow}>ready when you are.</Text>
              </Text>

              <Text style={styles.heroSubheadline} numberOfLines={2}>
                Order online and collect from your local store. Quality products and reliable service.
              </Text>

              <TouchableOpacity 
                style={styles.exploreCatalogBtn}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CategoriesTab', { screen: 'CategoriesScreen' })}
              >
                <Text style={styles.exploreCatalogText}>Explore Catalog</Text>
                <Feather name="chevron-right" size={16} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories / Explore Aisles Section */}
        {categories.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Explore Aisles</Text>
              <TouchableOpacity 
                style={styles.seeAllBtn}
                onPress={() => navigation.navigate('CategoriesTab')}
              >
                <Text style={styles.seeAllText}>See all →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.categoriesScrollList}
            >
              {categories.map((cat: any, index: number) => (
                <CategoryCard 
                  key={cat.id} 
                  category={cat} 
                  index={index}
                  style={styles.categoryCardHorizontal}
                  onPress={(c) => navigation.navigate('CategoriesTab', { 
                    screen: 'ProductListScreen', 
                    params: { categoryId: c.id, categoryName: c.name } 
                  })} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Dynamic Homepage Product Sections (Horizontal Scrolling Carousel - Scroll Left / Right) */}
        {sections.map((section: any, secIdx: number) => {
          const sectionProducts = (section.items || []).filter((item: any) => item && item.is_in_stock);
          if (sectionProducts.length === 0) return null;

          return (
            <View key={section.id || secIdx} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionTitle}>{stripEmojis(section.title)}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{sectionProducts.length}</Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.seeAllBtn}
                  onPress={() => {
                    const cleanTitle = stripEmojis(section.title);
                    const categoryId = section.category_id || section.category;
                    if (categoryId) {
                      navigation.navigate('CategoriesTab', { 
                        screen: 'ProductListScreen', 
                        params: { categoryId, categoryName: cleanTitle } 
                      });
                    } else {
                      navigation.navigate('CategoriesTab', { 
                        screen: 'ProductListScreen', 
                        params: { search: cleanTitle, categoryName: cleanTitle } 
                      });
                    }
                  }}
                >
                  <Text style={styles.seeAllText}>See all →</Text>
                </TouchableOpacity>
              </View>

              {/* Horizontal Scrollable Product Carousel (Scroll Left / Right) */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalProductsList}
              >
                {sectionProducts.map((product: any) => (
                  <View key={product.id} style={styles.horizontalProductItem}>
                    <ProductCard 
                      product={product} 
                      onPress={(p) => navigation.navigate('ProductDetailScreen', { productId: p.id })}
                      onAddToCart={(p) => addToCart(p.id, 1)}
                      isFavorite={favoriteIds.has(product.id)}
                      onToggleFavorite={(p) => toggleFavorite(p?.id ?? p)}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50 matching web
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSlate: {
    color: '#0F172A', // slate-900
  },
  brandRed: {
    color: '#DC2626', // red-600
  },
  searchBar: {
    flex: 1,
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  searchPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  carouselWrapper: {
    width: width,
    height: BANNER_HEIGHT,
    backgroundColor: '#F1F5F9', // bg-slate-100 matching web
    position: 'relative',
    marginBottom: 6,
    overflow: 'hidden',
  },
  bannersList: {},
  bannerSlide: {
    width: width,
    height: BANNER_HEIGHT,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 7,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  activeDot: {
    width: 28, // active wide pill w-8 matching web
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 3,
  },
  fallbackHeroBanner: {
    width: width,
    backgroundColor: '#065F46', // emerald-800 matching web
    paddingVertical: 22,
    paddingHorizontal: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  heroInnerContent: {
    position: 'relative',
    zIndex: 10,
  },
  heroFloatingEmojiCart: {
    position: 'absolute',
    top: 10,
    right: 32,
    fontSize: 26,
    opacity: 0.22,
  },
  heroFloatingEmojiVeg: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 24,
    opacity: 0.22,
  },
  heroDecorTopCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroDecorBottomCircle: {
    position: 'absolute',
    bottom: -30,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  heroTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroHeadlineYellow: {
    color: '#FDE047', // yellow-300 matching web
  },
  heroSubheadline: {
    fontSize: 12,
    color: '#D1FAE5', // emerald-100 matching web
    lineHeight: 18,
    marginBottom: 16,
  },
  exploreCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exploreCatalogText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionContainer: {
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  categoriesScrollList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  horizontalProductsList: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  horizontalProductItem: {
    width: Math.floor((width - 44) / 2.15), // ~2 visible products on screen with edge peek for smooth left-right scrolling
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryCardHorizontal: {
    marginRight: 12,
  },
});
