import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { AppNavigationProp } from '../../navigation/types';
import { RouteProp } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fixImageUrl } from '../../utils/image';

const { width } = Dimensions.get('window');

// TODO: Create a proper navigation types file
type RootStackParamList = {
  ProductDetailScreen: { productId: number };
};

type Props = {
  navigation: AppNavigationProp;
  route: RouteProp<RootStackParamList, 'ProductDetailScreen'>;
};

export function ProductDetailScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { productId } = route.params || {};
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchProduct();
    if (user) {
      checkFavorite();
    }
  }, [productId, user]);

  const fetchProduct = async () => {
    try {
      const res = await apiClient.get(`/products/${productId}/`);
      setProduct(res.data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    try {
      const res = await apiClient.get('/favorites/');
      const fav = res.data.find((f: any) => f.product === productId);
      if (fav) {
        setIsFavorite(true);
        setFavoriteId(fav.id);
      }
    } catch (error) {}
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!product) return <View style={styles.center}><Text>Product not found.</Text></View>;

  const primaryImage = fixImageUrl(product.image);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on Smart Kirana!`,
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add favorites');
      return;
    }
    if (toggling) return;
    
    setToggling(true);
    try {
      if (isFavorite && favoriteId) {
        await apiClient.delete(`/favorites/${favoriteId}/`);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const res = await apiClient.post('/favorites/', { product: productId });
        setIsFavorite(true);
        setFavoriteId(res.data.id);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not update favorites');
    } finally {
      setToggling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Actions */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Feather name="share-2" color={theme.colors.text} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleFavorite} disabled={toggling}>
            <Feather name="heart" color={isFavorite ? theme.colors.action : theme.colors.text} fill={isFavorite ? theme.colors.action : "transparent"} size={22} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image Gallery (Simplified to single primary image for now) */}
        <View style={styles.imageContainer}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={styles.placeholderImage} />
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoContainer}>
          {product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.unit}>{product.unit}</Text>

          <View style={styles.priceRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.price}>₹{product.price}</Text>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <Text style={styles.mrp}>₹{product.mrp}</Text>
              )}
            </View>
            
            {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountText}>
                  {Math.round(((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100)}% OFF
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Details</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={[styles.addToCartButton, !product.is_in_stock && styles.disabledButton]}
          disabled={!product.is_in_stock}
          onPress={() => addToCart(product.id, 1)}
        >
          <Feather name="shopping-cart" color={theme.colors.surface} size={20} />
          <Text style={styles.addToCartText}>
            {product.is_in_stock ? 'Add to Cart' : 'Out of Stock'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRight: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: theme.colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.border,
  },
  infoContainer: {
    padding: theme.spacing.lg,
  },
  brand: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 12,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    lineHeight: 30,
  },
  unit: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  price: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.colors.text,
  },
  mrp: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
    marginLeft: theme.spacing.sm,
  },
  discountBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  discountText: {
    color: theme.colors.surface,
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addToCartButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  disabledButton: {
    backgroundColor: theme.colors.textSecondary,
  },
  addToCartText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});



