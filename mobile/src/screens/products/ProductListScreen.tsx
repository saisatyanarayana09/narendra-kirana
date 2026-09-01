import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { ProductCard } from '../../components/ProductCard';
import { useCart } from '../../context/CartContext';

type Props = { navigation: AppNavigationProp; route: any; };

export function ProductListScreen({ navigation, route }: Props) {
  const { categoryId, categoryName } = route.params || {};
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const { addToCart } = useCart();
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setPage(1);
    fetchProducts(1);
  }, [categoryId]);

  const fetchProducts = async (pageNum = 1) => {
    try {
      const endpoint = categoryId 
        ? `/products/?category=${categoryId}&page=${pageNum}`
        : `/products/?page=${pageNum}`;
        
      const res = await apiClient.get(endpoint);
      
      if (pageNum === 1) {
        setProducts(res.data.results || res.data);
      } else {
        setProducts(prev => [...prev, ...(res.data.results || [])]);
      }
      
      setHasMore(res.data.next !== null);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchProducts(page + 1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName || 'Products'}</Text>
      </View>

      {loading && page === 1 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          refreshing={loading && page === 1}
          onRefresh={() => fetchProducts(1)}
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
            hasMore && page > 1 ? (
              <ActivityIndicator style={{ margin: 20 }} color={theme.colors.primary} />
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: theme.spacing.md,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
});



