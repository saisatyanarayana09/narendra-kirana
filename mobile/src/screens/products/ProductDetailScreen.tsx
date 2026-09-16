import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Dimensions, 
  Share, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Image } from 'expo-image';
import { AppNavigationProp } from '../../navigation/types';
import { Feather, Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { fixImageUrl, getOptimizedImageUrl } from '../../utils/image';
import { favoritesService } from '../../services/favoritesService';

const { width } = Dimensions.get('window');

export function ProductDetailScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const insets = useSafeAreaInsets();
  const { productId, initialProduct } = route.params || {};
  const { addToCart, cart } = useCart();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  
  const [product, setProduct] = useState<any>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [isFavorite, setIsFavorite] = useState(favoritesService.isFavorite(productId));
  const [favoriteId, setFavoriteId] = useState<number | null>(favoritesService.getFavoriteId(productId) || null);
  const [toggling, setToggling] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const checkFavorite = useCallback(async () => {
    if (!user) return;
    if (favoritesService.isFavorite(productId)) {
      setIsFavorite(true);
      setFavoriteId(favoritesService.getFavoriteId(productId) || null);
      return;
    }
    if (!favoritesService.hasCachedData()) {
      try {
        await favoritesService.getFavorites();
        if (favoritesService.isFavorite(productId)) {
          setIsFavorite(true);
          setFavoriteId(favoritesService.getFavoriteId(productId) || null);
        }
      } catch (error) {}
    }
  }, [user, productId]);

  useEffect(() => {
    fetchProduct();
    if (user) {
      checkFavorite();
      const unsub = favoritesService.subscribe(() => {
        const isFav = favoritesService.isFavorite(productId);
        setIsFavorite(isFav);
        setFavoriteId(favoritesService.getFavoriteId(productId) || null);
      });
      return unsub;
    }
  }, [productId, user, checkFavorite]);

  const fetchProduct = async () => {
    try {
      const res = await apiClient.get(`/products/${productId}/`);
      if (res?.data) {
        setProduct((prev: any) => ({ ...(prev || {}), ...res.data }));
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;
  if (!product) return <View style={styles.center}><Text style={styles.notFoundText}>Product not found.</Text></View>;

  const images: string[] = [];
  if (product.image) {
    const fixed = getOptimizedImageUrl(product.image, 800, 800) || fixImageUrl(product.image);
    if (fixed) images.push(fixed);
  }
  if (product.name?.toLowerCase().includes('pumpkin') && (images.length === 0 || images[0]?.includes('dummyimage.com') || images[0]?.endsWith('/media/'))) {
    images[0] = 'https://raw.githubusercontent.com/saisatyanarayana09/narendra-kirana/main/frontend/public/products/pumpkin_seeds.jpg';
  }
  if (product.gallery_images && Array.isArray(product.gallery_images)) {
    product.gallery_images.forEach((g: any) => {
      const raw = g.image || g;
      const fixed = getOptimizedImageUrl(raw, 800, 800) || fixImageUrl(raw);
      if (fixed && !images.includes(fixed)) {
        images.push(fixed);
      }
    });
  }
  const currentImage = images.length > 0 ? (images[activeImageIndex] || images[0]) : null;

  const price = product.offer_price || product.regular_price || product.price || '0';
  const regPrice = parseFloat(product.regular_price || product.mrp || '0');
  const offPrice = parseFloat(product.offer_price || product.price || '0');
  const discountPercent = product.offer_price && regPrice > offPrice 
    ? Math.round(((regPrice - offPrice) / regPrice) * 100) 
    : 0;

  const cartItem = cart?.items?.find((item: any) => item.product?.id === product.id || item.product === product.id);
  const maxAllowed = product.max_order_quantity > 0 
    ? Math.min(product.stock_quantity, product.max_order_quantity) 
    : product.stock_quantity;
  const isMaxReached = cartItem && cartItem.quantity >= maxAllowed;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} on Narendra Kirana!`,
      });
    } catch (error: any) {
      console.error(error);
    }
  };

  const handleFavorite = async () => {
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
    if (toggling) return;
    
    setToggling(true);
    try {
      await favoritesService.toggleFavorite(productId, product);
    } catch (error) {
      Alert.alert('Error', 'Could not update favorites');
    } finally {
      setToggling(false);
    }
  };

  const handleAddToCart = async () => {
    setAdding(true);
    try {
      await addToCart(product.id, 1, product);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to add to cart.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Actions */}
      <View style={[styles.header, { top: insets.top + 10 }]}>
        <TouchableOpacity 
          style={[styles.headerButton, styles.backButton, isDark && { backgroundColor: 'rgba(30, 41, 59, 0.92)' }]} 
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('HomeTab');
            }
          }}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" color={isDark ? colors.text : "#0F172A"} size={20} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.headerButton, styles.shareButton, isDark && { backgroundColor: 'rgba(30, 41, 59, 0.92)' }]} 
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Feather name="share-2" color={isDark ? colors.text : "#0F172A"} size={18} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, styles.heartButton, isDark && { backgroundColor: 'rgba(30, 41, 59, 0.92)' }]} 
            onPress={handleFavorite} 
            disabled={toggling}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={isFavorite ? "heart" : "heart-outline"} 
              color={isFavorite ? "#E11D48" : (isDark ? colors.text : "#0F172A")} 
              size={20} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Product Image */}
        <View style={[styles.imageContainer, { backgroundColor: isDark ? colors.surface : '#F8FAFC' }]}>
          {discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Feather name="zap" size={10} color="#FFFFFF" />
              <Text style={styles.discountBadgeText}>{discountPercent}% OFF</Text>
            </View>
          )}

          {currentImage ? (
            <Image source={{ uri: currentImage }} style={styles.image} contentFit="contain" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.placeholderBox, { backgroundColor: colors.inputBg }]}>
              <Text style={[styles.placeholderLetter, { color: colors.textSecondary }]}>{product.name?.charAt(0) || 'P'}</Text>
            </View>
          )}

          {!product.is_in_stock && (
            <View style={styles.outOfStockOverlay}>
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
              </View>
            </View>
          )}
        </View>

        {/* Gallery Thumbnails (if multiple images) matching customer.jsx */}
        {images.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={[styles.galleryThumbnailsContainer, { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderBottomColor: colors.border }]}
          >
            {images.map((img: string, i: number) => (
              <TouchableOpacity
                key={i}
                onPress={() => setActiveImageIndex(i)}
                style={[
                  styles.galleryThumbnail,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  activeImageIndex === i && styles.galleryThumbnailActive
                ]}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: getOptimizedImageUrl(img, 120, 120) }} 
                  style={styles.galleryThumbnailImage} 
                  contentFit="cover" 
                  cachePolicy="memory-disk" 
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{product.category_name || 'GROCERY'}</Text>
          </View>

          {product.brand && <Text style={[styles.brand, { color: colors.textSecondary }]}>{product.brand}</Text>}
          <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>{product.unit}</Text>

          {/* Tags Chips */}
          {product.tags && (
            <View style={styles.tagsRow}>
              {product.tags.split(',').map((tag: string, i: number) => (
                <View key={i} style={[styles.tagChip, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <Text style={styles.tagChipText}>{tag.trim()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Price Row */}
          <View style={[styles.priceRow, { borderBottomColor: colors.border }]}>
            <View style={styles.priceLeft}>
              <Text style={[styles.price, { color: colors.text }]}>₹{price}</Text>
              {product.offer_price && (
                <Text style={styles.mrp}>₹{product.regular_price}</Text>
              )}
            </View>
          </View>

          {/* Product Description */}
          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Product Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {product.description || 'Fresh, quality essentials from your local store.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar matching web app */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={[
            styles.addToCartButton, 
            !product.is_in_stock && [styles.disabledButton, isDark && { backgroundColor: colors.inputBg }],
            added && [styles.addedButton, isDark && { backgroundColor: colors.inputBg, borderColor: colors.border }],
            isMaxReached && [styles.maxReachedButton, isDark && { backgroundColor: colors.inputBg, borderColor: colors.border }]
          ]}
          disabled={!product.is_in_stock || adding || added || isMaxReached}
          onPress={handleAddToCart}
          activeOpacity={0.9}
        >
          {added ? (
            <Text style={[styles.addedText, isDark && { color: colors.text }]}>✓ Added to cart</Text>
          ) : isMaxReached ? (
            <Text style={styles.maxReachedText}>Max in cart</Text>
          ) : adding ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="shopping-cart" color="#FFFFFF" size={18} />
              <Text style={styles.addToCartText}>
                {product.is_in_stock ? `${t('addToCart')} · ₹${price}` : t('outOfStock')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  backButton: {},
  shareButton: {},
  heartButton: {},
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
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
    gap: 8,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    width: width,
    height: width * 0.85,
    backgroundColor: '#F8FAFC',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '80%',
    height: '80%',
  },
  placeholderBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLetter: {
    fontSize: 40,
    fontWeight: '900',
    color: '#CBD5E1',
  },
  galleryThumbnailsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  galleryThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  galleryThumbnailActive: {
    borderColor: '#DC2626',
  },
  galleryThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    zIndex: 10,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    zIndex: 15,
  },
  outOfStockBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  infoContainer: {
    padding: 20,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  brand: {
    color: '#64748B',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
  },
  unit: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
  },
  mrp: {
    fontSize: 16,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  descriptionSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  addToCartButton: {
    backgroundColor: '#DC2626', // Red-600 matching web app
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#F1F5F9',
    shadowOpacity: 0,
    elevation: 0,
  },
  addedButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  maxReachedButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  addedText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  maxReachedText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '800',
  },
});
