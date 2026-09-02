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
import { Feather } from '@expo/vector-icons';
import { fixImageUrl } from '../utils/image';
import { theme } from '../constants/theme';
import { useCart } from '../context/CartContext';

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
  onAddToCart?: (product: Product) => void;
  style?: StyleProp<ViewStyle>;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
}

export function ProductCard({ 
  product, 
  onPress, 
  onAddToCart, 
  style,
  isFavorite,
  onToggleFavorite
}: ProductCardProps) {
  const { cart, addToCart } = useCart();
  const [updating, setUpdating] = useState(false);
  const [added, setAdded] = useState(false);

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

  // In-cart quantity check
  const cartItem = cart?.items?.find((item: any) => {
    const pId = item.product?.id ?? item.product;
    return pId === product.id;
  });

  const cartQty = cartItem?.quantity || 0;
  const inCart = cartQty > 0;

  const stockQty = product.stock_quantity ?? 999;
  const maxOrderQty = product.max_order_quantity ?? 0;
  const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
  const isMaxReached = inCart && cartQty >= maxAllowed;

  const primaryImage = fixImageUrl(product.image);

  const handleAdd = async () => {
    if (updating || !isInStock || isMaxReached) return;
    setUpdating(true);
    try {
      if (onAddToCart) {
        onAddToCart(product);
      } else {
        await addToCart(product.id, 1);
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={() => onPress(product)}
      activeOpacity={0.9}
    >
      {/* Image container */}
      <View style={[styles.imageContainer, !isInStock && styles.imageOutOfStock]}>
        {/* Discount ribbon at top left */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Feather name="zap" size={10} color="#FFFFFF" />
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {/* Favorite button at top right */}
        {onToggleFavorite && (
          <TouchableOpacity 
            style={styles.favoriteButton} 
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleFavorite(product);
            }}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather 
              name="heart" 
              size={15} 
              color={isFavorite ? "#E11D48" : "#94A3B8"} 
              fill={isFavorite ? "#E11D48" : "transparent"} 
            />
          </TouchableOpacity>
        )}

        {/* Product image or initial letter fallback */}
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderLetter}>
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
          <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        )}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit || '1 unit'}</Text>
        
        {/* Optional Tag Chips */}
        {product.tags && (
          <View style={styles.tagsContainer}>
            {product.tags.split(',').slice(0, 1).map((tag: string, i: number) => (
              <View key={i} style={styles.tagBadge}>
                <Text style={styles.tagText} numberOfLines={1}>{tag.trim()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Price Row: ₹{price} and strikethrough ₹{mrp} */}
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{parsedPrice}</Text>
          {discount > 0 && (
            <Text style={styles.mrp}>₹{parsedMrp}</Text>
          )}
        </View>

        {/* Add to Cart Button matching web app customer.jsx:250-264 */}
        <View style={styles.actionContainer}>
          {!isInStock ? (
            <View style={styles.outOfStockButton}>
              <Text style={styles.outOfStockButtonText}>Out of stock</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.addToCartButton, 
                added && styles.addedButton,
                isMaxReached && styles.maxReachedButton
              ]}
              onPress={handleAdd}
              disabled={updating || added || isMaxReached}
              activeOpacity={0.85}
            >
              {isMaxReached ? (
                <Text style={styles.maxReachedText}>Max in cart</Text>
              ) : added ? (
                <Text style={styles.addedText}>✓ Added!</Text>
              ) : updating ? (
                <Text style={styles.addToCartText}>Adding...</Text>
              ) : (
                <>
                  <Feather name="shopping-cart" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '100%',
    height: 284, // Uniform card height matching web app
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
    maxHeight: 34,
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
    color: '#475569', // text-slate-600 matching web customer.jsx:238
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
  addToCartButton: {
    backgroundColor: '#DC2626', // Red-600 matching web app
    borderRadius: 12, // rounded-xl matching web customer.jsx:258
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addedButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  addedText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
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
    height: 36,
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
