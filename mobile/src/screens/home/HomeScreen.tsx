import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ProductCard } from '../../components/ProductCard';
import { CategoryCard } from '../../components/CategoryCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MainTabParamList } from '../../navigation/MainTabs';
import { fixImageUrl } from '../../utils/image';

// Type definitions could go in a shared types file
type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  NativeStackNavigationProp<any> // Simplification for now
>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

const { width } = Dimensions.get('window');

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [sections, setSections] = useState([]);
  
  const fetchHomeData = async () => {
    try {
      const [catsRes, bannersRes, sectionsRes] = await Promise.all([
        apiClient.get('/categories/'),
        apiClient.get('/offers/banners/'),
        apiClient.get('/store/homepage-sections/')
      ]);
      
      setCategories(catsRes.data);
      setBanners(bannersRes.data);
      setSections(sectionsRes.data);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchHomeData();
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Deliver to</Text>
          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={16} color={theme.colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              Select Location
            </Text>
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.first_name?.[0] || 'U'}</Text>
        </View>
      </View>

      {/* Search Bar (Fake, navigates to real search) */}
      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchBar}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('SearchScreen')}
        >
          <Feather name="search" size={20} color={theme.colors.textSecondary} />
          <Text style={styles.searchText}>Search for groceries...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Banners */}
        {banners.length > 0 ? (
          <View>
            <FlatList
              data={banners}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={width - 24 + 12} // banner width + margin
              decelerationRate="fast"
              contentContainerStyle={styles.bannersContainer}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.banner}>
                  <Image source={{ uri: fixImageUrl(item.image) || '' }} style={styles.bannerImage} />
                </TouchableOpacity>
              )}
            />
            {/* Dots would require onScroll tracking, skipping complex state for now and keeping it simple as we did not add activeIndex state */}
          </View>
        ) : (
          <View style={styles.fallbackBanner}>
            <View style={styles.fallbackBannerContent}>
              <Text style={styles.fallbackBannerTitle}>Fresh Groceries,{'\n'}Delivered Fast ⚡</Text>
              <TouchableOpacity style={styles.fallbackBannerButton} onPress={() => navigation.navigate('CategoriesTab', { screen: 'CategoriesScreen' })}>
                <Text style={styles.fallbackBannerButtonText}>Explore Catalog</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
              {categories.map((cat: any, index: number) => (
                <CategoryCard 
                  key={cat.id} 
                  category={cat} 
                  index={index}
                  onPress={(c) => navigation.navigate('CategoriesTab', { screen: 'ProductListScreen', params: { categoryId: c.id } })} 
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Dynamic Sections */}
        {sections.map((section: any) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsContainer}>
              {section.section_products?.map((sp: any) => sp.product_details && (
                <ProductCard 
                  key={sp.product_details.id} 
                  product={sp.product_details} 
                  onPress={(p) => navigation.navigate('ProductDetailScreen', { productId: p.id })}
                  onAddToCart={(p) => addToCart(p.id, 1)}
                />
              ))}
            </ScrollView>
          </View>
        ))}
        
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  greeting: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.primaryDark,
    fontWeight: 'bold',
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchText: {
    marginLeft: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  bannersContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  banner: {
    width: 320,
    height: 160,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBanner: {
    backgroundColor: '#065f46',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderRadius: 16,
    height: 160,
    justifyContent: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  fallbackBannerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  fallbackBannerTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 16,
  },
  fallbackBannerButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  fallbackBannerButtonText: {
    color: '#065f46',
    fontWeight: '800',
    fontSize: 14,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  seeAllText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  productsContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
});
