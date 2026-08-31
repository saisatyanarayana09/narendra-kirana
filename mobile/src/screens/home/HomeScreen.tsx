import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, MapPin } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../../components/ProductCard';
import { CategoryCard } from '../../components/CategoryCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { MainTabParamList } from '../../navigation/MainTabs';

// Type definitions could go in a shared types file
type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'HomeTab'>,
  NativeStackNavigationProp<any> // Simplification for now
>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  
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
            <MapPin size={16} color={theme.colors.primary} />
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
          <Search size={20} color={theme.colors.textSecondary} />
          <Text style={styles.searchText}>Search for groceries...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
      >
        {/* Banners */}
        {banners.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.bannersContainer}
            snapToInterval={336}
            decelerationRate="fast"
          >
            {banners.map((banner: any) => (
              <TouchableOpacity key={banner.id} style={styles.banner}>
                <Image source={{ uri: banner.image }} style={styles.bannerImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
              {categories.map((cat: any) => (
                <CategoryCard 
                  key={cat.id} 
                  category={cat} 
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
              {section.section_products.map((sp: any) => (
                <ProductCard 
                  key={sp.product.id} 
                  product={sp.product} 
                  onPress={(p) => navigation.navigate('ProductDetailScreen', { productId: p.id })}
                  onAddToCart={(p) => console.log('Add to cart', p.id)}
                />
              ))}
            </ScrollView>
          </View>
        ))}
        
        <View style={{ height: 40 }} />
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
