import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StyleProp, 
  ViewStyle 
} from 'react-native';
import { Image } from 'expo-image';
import { Feather, Ionicons } from '@expo/vector-icons';
import { fixImageUrl, getOptimizedImageUrl } from '../utils/image';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { BouncyTouchable } from './BouncyTouchable';

export interface Product {
  id: number;
  name: string;
  brand?: string | null;
  price?: string | number;
  regular_price?: string | number;
  offer_price?: string | number | null;
  mrp?: string | number | null;
  unit?: string;
  is_in_stock?: boolean;
  stock_quantity?: number;
  max_order_quantity?: number;
  image?: string | null;
  tags?: string | null;
  category_name?: string;
  [key: string]: any;
}

export interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  onAddToCart?: (product: Product) => void | Promise<void>;
  onUpdateQuantity?: (productId: number, newQty: number) => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  isFavorite?: boolean | ((productId: number) => boolean);
  onToggleFavorite?: (product: any) => void;
  cartQty?: number;
}

function ProductCardComponent({ 
  product, 
  onPress, 
  onAddToCart, 
  onUpdateQuantity,
  style,
  isFavorite,
  onToggleFavorite,
  cartQty: propCartQty,
}: ProductCardProps) {
  const { colors, isDark } = useTheme();
  const [updating, setUpdating] = useState(false);

  const isFav = typeof isFavorite === 'function' ? Boolean(isFavorite(product.id)) : Boolean(isFavorite);

  // Price calculations matching customer.jsx
  const rawPrice = product.offer_price || product.price || product.regular_price || 0;
  const parsedPrice = parseFloat(String(rawPrice)) || 0;

  const rawMrp = product.regular_price || product.mrp || 0;
  const parsedMrp = parseFloat(String(rawMrp)) || 0;

  const discount = (product.offer_price && parsedMrp > parsedPrice && parsedMrp > 0)
    ? Math.round(((parsedMrp - parsedPrice) / parsedMrp) * 100)
    : (parsedMrp > parsedPrice && parsedMrp > 0
      ? Math.round(((parsedMrp - parsedPrice) / parsedMrp) * 100)
      : 0);

  const isInStock = product.is_in_stock !== false && (product.stock_quantity === undefined || product.stock_quantity > 0);

  // In-cart quantity check via prop (decoupled from CartContext for maximum React.memo performance)
  const currentCartQty = propCartQty ?? 0;
  const inCart = currentCartQty > 0;

  const stockQty = product.stock_quantity ?? 999;
  const maxOrderQty = product.max_order_quantity ?? 0;
  const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
  const isMaxReached = inCart && currentCartQty >= maxAllowed;

  let primaryImage = getOptimizedImageUrl(product.image, 320, 320);
  if (product.name?.toLowerCase().includes('pumpkin') && (!primaryImage || primaryImage.includes('dummyimage.com') || primaryImage.endsWith('/media/'))) {
    primaryImage = 'https://raw.githubusercontent.com/saisatyanarayana09/narendra-kirana/main/frontend/public/products/pumpkin_seeds.jpg';
  }

  const handleAdd = async () => {
    if (updating || !isInStock || isMaxReached) return;
    setUpdating(true);
    try {
      if (onUpdateQuantity) {
        await Promise.resolve(onUpdateQuantity(product.id, 1));
      } else if (onAddToCart) {
        await Promise.resolve(onAddToCart(product));
      }
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDecrease = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const nextQty = currentCartQty - 1;
      if (onUpdateQuantity) {
        await Promise.resolve(onUpdateQuantity(product.id, nextQty));
      } else if (onAddToCart) {
        await Promise.resolve(onAddToCart(product));
      }
    } catch (err) {
      console.error('Decrease quantity failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleIncrease = async () => {
    if (updating || isMaxReached) return;
    setUpdating(true);
    try {
      const nextQty = currentCartQty + 1;
      if (onUpdateQuantity) {
        await Promise.resolve(onUpdateQuantity(product.id, nextQty));
      } else if (onAddToCart) {
        await Promise.resolve(onAddToCart(product));
      }
    } catch (err) {
      console.error('Increase quantity failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: colors.surface, borderColor: colors.border },
        style
      ]} 
      onPress={() => onPress(product)}
      activeOpacity={0.9}
    >
      {/* Image container */}
      <View style={[
        styles.imageContainer, 
        { backgroundColor: isDark ? colors.background : '#F8FAFC' },
        !isInStock && styles.imageOutOfStock
      ]}>
        {/* Discount ribbon at top left */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Feather name="zap" size={10} color="#FFFFFF" />
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {/* Favorite button at top right */}
        {onToggleFavorite && (
          <BouncyTouchable 
            style={[
              styles.favoriteButton,
              isDark && { backgroundColor: 'rgba(30, 41, 59, 0.92)' }
            ]} 
            onPress={(e) => {
              e?.stopPropagation?.();
              onToggleFavorite(product);
            }}
            scaleTo={0.82}
            hapticType="selection"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name={isFav ? "heart" : "heart-outline"} 
              size={16} 
              color={isFav ? "#E11D48" : (isDark ? "#64748B" : "#94A3B8")} 
            />
          </BouncyTouchable>
        )}

        {/* Product image or initial letter fallback */}
        {primaryImage ? (
          <Image 
            source={{ uri: primaryImage }} 
            style={styles.image} 
            contentFit="contain"
            recyclingKey={primaryImage || String(product.id)}
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.placeholderLetter, { color: colors.textSecondary }]}>
              {product.name?.charAt(0)?.toUpperCase() || 'P'}
            </Text>
          </View>
        )}

        {/* Out of stock overlay */}
        {!isInStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {product.brand && (
          <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>{product.brand}</Text>
        )}
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{product.name}</Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>{product.unit || '1 unit'}</Text>
        
        {/* Optional Tag Chips */}
        {product.tags && (
          <View style={styles.tagsContainer}>
            {product.tags.split(',').slice(0, 1).map((tag: string, i: number) => (
              <View key={i} style={[styles.tagBadge, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                <Text style={styles.tagText} numberOfLines={1}>{tag.trim()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Price Row: ₹{price} and strikethrough ₹{mrp} */}
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.text }]}>₹{parsedPrice}</Text>
          {discount > 0 && (
            <Text style={styles.mrp}>₹{parsedMrp}</Text>
          )}
        </View>

        {/* Add to Cart / Inline Stepper */}
        <View style={styles.actionContainer}>
          {!isInStock ? (
            <View style={[styles.outOfStockButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={styles.outOfStockButtonText}>Out of stock</Text>
            </View>
          ) : currentCartQty > 0 ? (
            <View style={[styles.stepperContainer, { backgroundColor: colors.primary }]}>
              <BouncyTouchable
                style={styles.stepperBtn}
                onPress={handleDecrease}
                hapticType="light"
                scaleTo={0.88}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={updating}
              >
                {currentCartQty === 1 ? (
                  <Feather name="trash-2" size={14} color="#FFFFFF" />
                ) : (
                  <Feather name="minus" size={16} color="#FFFFFF" />
                )}
              </BouncyTouchable>

              <Text style={styles.stepperQtyText}>
                {currentCartQty}
              </Text>

              <BouncyTouchable
                style={[styles.stepperBtn, isMaxReached && styles.stepperBtnDisabled]}
                onPress={handleIncrease}
                hapticType="light"
                scaleTo={0.88}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={updating || isMaxReached}
              >
                <Feather 
                  name="plus" 
                  size={16} 
                  color={isMaxReached ? 'rgba(255, 255, 255, 0.4)' : '#FFFFFF'} 
                />
              </BouncyTouchable>
            </View>
          ) : (
            <BouncyTouchable 
              style={[
                styles.addButton, 
                { 
                  borderColor: colors.primary,
                  backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#F0FDF4',
                },
                isMaxReached && [styles.maxReachedButton, isDark && { backgroundColor: colors.inputBg, borderColor: colors.border }]
              ]}
              onPress={handleAdd}
              disabled={updating || isMaxReached}
              hapticType="medium"
              scaleTo={0.95}
            >
              {isMaxReached ? (
                <Text style={styles.maxReachedText}>Max in cart</Text>
              ) : updating ? (
                <Text style={[styles.addButtonText, { color: colors.primary }]}>Adding...</Text>
              ) : (
                <View style={styles.addButtonContent}>
                  <Text style={[styles.addButtonText, { color: colors.primary }]}>ADD</Text>
                  <Feather name="plus" size={14} color={colors.primary} style={styles.addButtonPlus} />
                </View>
              )}
            </BouncyTouchable>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export const ProductCard = React.memo(ProductCardComponent, (prevProps, nextProps) => {
  const prevFav = typeof prevProps.isFavorite === 'function' ? Boolean(prevProps.isFavorite(prevProps.product.id)) : Boolean(prevProps.isFavorite);
  const nextFav = typeof nextProps.isFavorite === 'function' ? Boolean(nextProps.isFavorite(nextProps.product.id)) : Boolean(nextProps.isFavorite);

  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.offer_price === nextProps.product.offer_price &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.stock_quantity === nextProps.product.stock_quantity &&
    prevProps.product.is_in_stock === nextProps.product.is_in_stock &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.image === nextProps.product.image &&
    prevFav === nextFav &&
    prevProps.cartQty === nextProps.cartQty &&
    prevProps.style === nextProps.style &&
    prevProps.onUpdateQuantity === nextProps.onUpdateQuantity &&
    prevProps.onAddToCart === nextProps.onAddToCart
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    minHeight: 284, // Uniform minimum card height so titles with tags/price never get squeezed
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'column',
    overflow: 'hidden',
  },
  imageContainer: {
    height: 128, // Exact h-32 (128px) matching web customer.jsx:72
    backgroundColor: '#F8FAFC',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  imageOutOfStock: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: {
    fontSize: 36,
    fontWeight: '900',
    color: '#CBD5E1',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    padding: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -12 }],
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    padding: 10,
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 1,
    fontWeight: '700',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 17,
  },
  unit: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 3,
  },
  tagBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#DC2626',
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  price: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  mrp: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 'auto',
  },
  addButton: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addButtonPlus: {
    marginLeft: 3,
  },
  stepperContainer: {
    height: 38,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 6,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  stepperBtnDisabled: {
    opacity: 0.45,
  },
  stepperQtyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    minWidth: 24,
  },
  maxReachedButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  maxReachedText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  outOfStockButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outOfStockButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
});
