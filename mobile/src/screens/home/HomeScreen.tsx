import React, { useState, useEffect, useRef } from 'react';
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
import { fixImageUrl } from '../../utils/image';

type Props = {
  navigation: AppNavigationProp;
};

const { width } = Dimensions.get('window');
const BANNER_WIDTH = width - 32;
const SECTION_ICONS = ['🔥', '⭐', '🆕', '💎', '🎯', '🌟', '✨', '🏷️'];

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

  const bannerFlatListRef = useRef<FlatList>(null);

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
  }, []);

  // Auto-scroll banners every 4 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        bannerFlatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
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
              ref={bannerFlatListRef}
              data={banners}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={BANNER_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={styles.bannersList}
              keyExtractor={(item: any) => String(item.id)}
              onMomentumScrollEnd={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / (BANNER_WIDTH + 16));
                setActiveBannerIndex(index);
              }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  activeOpacity={0.9}
                  style={[styles.bannerCard, { width: BANNER_WIDTH }]}
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

            {/* Carousel Dots */}
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
            <View style={styles.heroDecorTopCircle} />
            <View style={styles.heroDecorBottomCircle} />
            
            <View style={styles.heroTagPill}>
              <Feather name="star" size={12} color="#FDE047" />
              <Text style={styles.heroTagText}>
                {settings?.store_name || 'NARENDRA KIRANA STORE'}
              </Text>
            </View>

            <Text style={styles.heroHeadline}>
              Everyday essentials, <Text style={styles.heroHeadlineYellow}>ready when you are.</Text>
            </Text>

            <Text style={styles.heroSubheadline}>
              Order online and collect from your local store. Quality products, straightforward pricing, and reliable service.
            </Text>

            <TouchableOpacity 
              style={styles.exploreCatalogBtn}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('CategoriesTab', { screen: 'CategoriesScreen' })}
            >
              <Text style={styles.exploreCatalogText}>Explore Catalog</Text>
              <Feather name="chevron-right" size={18} color="#0F172A" />
            </TouchableOpacity>
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

        {/* Dynamic Homepage Product Sections (2-column Grid matching Web App) */}
        {sections.map((section: any, secIdx: number) => {
          const sectionProducts = (section.items || []).filter((item: any) => item && item.is_in_stock);
          if (sectionProducts.length === 0) return null;

          return (
            <View key={section.id || secIdx} style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionIcon}>
                    {SECTION_ICONS[secIdx % SECTION_ICONS.length]}
                  </Text>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.seeAllBtn}
                  onPress={() => navigation.navigate('CategoriesTab', { screen: 'ProductListScreen', params: {} })}
                >
                  <Text style={styles.seeAllText}>View all</Text>
                  <Feather name="chevron-right" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* 2-Column Product Grid */}
              <View style={styles.productsGrid}>
                {sectionProducts.map((product: any) => (
                  <View key={product.id} style={styles.productGridItem}>
                    <ProductCard 
                      product={product} 
                      onPress={(p) => navigation.navigate('ProductDetailScreen', { productId: p.id })}
                      onAddToCart={(p) => addToCart(p.id, 1)}
                    />
                  </View>
                ))}
              </View>
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
    marginTop: 12,
    marginBottom: 8,
  },
  bannersList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  bannerCard: {
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  activeDot: {
    width: 20,
    backgroundColor: '#065F46',
  },
  fallbackHeroBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: '#065F46', // emerald-800 matching web
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#065F46',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
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
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  productGridItem: {
    width: (width - 44) / 2,
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    fontSize: 18,
  },
  categoryCardHorizontal: {
    marginRight: 12,
  },
});
