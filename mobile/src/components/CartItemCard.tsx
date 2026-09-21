import React, { memo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { fixImageUrl, getOptimizedImageUrl } from '../utils/image';
import { CartItem } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  item: CartItem;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  isLoading?: boolean;
}

export const CartItemCard = memo(function CartItemCard({ item, onUpdateQuantity, onRemove, isLoading }: Props) {
  const { colors, isDark } = useTheme();
  
  const [localQty, setLocalQty] = useState(item.quantity);
  const localQtyRef = React.useRef(localQty);

  // CartContext serializes requests and suppresses superseded responses. That
  // makes the cart state the single source of truth without an arbitrary
  // timeout that can revert the stepper during a slow request.
  useEffect(() => {
    localQtyRef.current = item.quantity;
    setLocalQty(item.quantity);
  }, [item.quantity]);

  const maxOrderQty = item.max_order_quantity ?? item.product?.max_order_quantity ?? 0;
  const stockQty = item.stock_quantity ?? item.product?.stock_quantity ?? 999;
  const isOutOfStock = item.is_in_stock === false || item.product?.is_in_stock === false || (stockQty !== undefined && stockQty <= 0);
  const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
  const isMaxReached = isOutOfStock || localQty >= maxAllowed;

  const handleIncrement = () => {
    // Hard cap in JS to prevent web from bypassing the disabled prop on rapid taps
    if (localQtyRef.current >= maxAllowed || isOutOfStock) return;
    triggerHaptic('medium');
    const nextQty = Math.min(localQtyRef.current + 1, maxAllowed);
    localQtyRef.current = nextQty;
    setLocalQty(nextQty);
    onUpdateQuantity(item.id, nextQty);
  };

  const handleDecrement = () => {
    triggerHaptic('medium');
    const nextQty = localQtyRef.current - 1;
    localQtyRef.current = Math.max(0, nextQty);
    setLocalQty(Math.max(0, nextQty));
    onUpdateQuantity(item.id, nextQty); // let context handle qty <= 0 → remove
  };

  const rawImage = item.product_image || item.product?.image;
  const primaryImage = getOptimizedImageUrl(rawImage, 160, 160) || fixImageUrl(rawImage);
  const productName = item.product_name || item.product?.name || 'Product';
  const unitPrice = item.unit_price || item.product?.price || '0.00';
  const unitName = item.product_unit || item.product?.unit || 'Unit';

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.surface, borderColor: isOutOfStock ? '#FCA5A5' : colors.border },
      isOutOfStock && { backgroundColor: isDark ? '#2D1517' : '#FEF2F2' }
    ]}>
      {/* Product Image / Initial Placeholder */}
      <View style={[styles.imageContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
        {primaryImage ? (
          <Image 
            source={{ uri: primaryImage }} 
            style={[styles.image, isOutOfStock && { opacity: 0.5 }]} 
            contentFit="cover" 
            cachePolicy="memory-disk"
            recyclingKey={primaryImage}
          />
        ) : (
          <View style={[styles.placeholderBox, { backgroundColor: colors.inputBg }]}>
            <Text style={styles.placeholderLetter}>
              {productName.charAt(0)?.toUpperCase() || 'P'}
            </Text>
          </View>
        )}
        {isOutOfStock && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockBadgeText}>OOS</Text>
          </View>
        )}
      </View>
      
      {/* Product Details */}
      <View style={styles.details}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{productName}</Text>
        <Text style={[styles.unitText, { color: colors.textSecondary }]} numberOfLines={1}>
          ₹{unitPrice} · {unitName}
          {localQty > 1 ? ` · Subtotal: ₹${(parseFloat(unitPrice) * localQty).toFixed(2)}` : ''}
        </Text>
        {isOutOfStock ? (
          <Text style={styles.outOfStockNoticeText} numberOfLines={1}>
            ⚠️ Out of stock · Remove to checkout
          </Text>
        ) : isMaxReached ? (
          <Text style={[styles.limitReachedText, { color: isDark ? '#FBBF24' : '#D97706' }]} numberOfLines={1}>
            {maxOrderQty > 0 && maxOrderQty <= stockQty 
              ? `Max limit of ${maxAllowed} reached`
              : `Only ${maxAllowed} in stock`}
          </Text>
        ) : null}
      </View>

      {/* Quantity Selector Stepper matching web app */}
      <View style={[
        styles.stepperContainer, 
        { backgroundColor: colors.inputBg, borderColor: colors.border },
        isOutOfStock && { opacity: 0.5 }
      ]}>
        <TouchableOpacity 
          style={styles.stepperButton}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          onPress={handleDecrement}
          disabled={isLoading || isOutOfStock}
          activeOpacity={0.7}
        >
          <Feather name="minus" size={16} color={isDark ? colors.text : "#334155"} />
        </TouchableOpacity>

        <Text style={[styles.quantityText, { color: colors.text }]}>{localQty}</Text>

        <TouchableOpacity 
          style={[styles.stepperButton, isMaxReached && styles.disabledStepperBtn]}
          hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
          onPress={handleIncrement}
          disabled={isMaxReached || isLoading || isOutOfStock}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={isMaxReached ? (isDark ? "#475569" : "#CBD5E1") : (isDark ? colors.text : "#334155")} />
        </TouchableOpacity>
      </View>

      {/* Delete / Remove Action */}
      <TouchableOpacity 
        style={styles.deleteButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={() => {
          triggerHaptic('warning');
          onRemove(item.id);
        }}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Feather name="trash-2" size={18} color={isOutOfStock ? "#EF4444" : (isDark ? "#F87171" : "#94A3B8")} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 10,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.03)',
    elevation: 1,
  },
  imageContainer: {
    width: 52,
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  placeholderLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  details: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    color: '#0F172A', // slate-900
    marginBottom: 2,
  },
  unitText: {
    fontSize: 13,
    color: '#64748B', // slate-500
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  limitReachedText: {
    fontSize: 11,
    color: '#D97706', // amber-600
    fontWeight: '700',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  stepperButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledStepperBtn: {
    opacity: 0.5,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 24,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  deleteButton: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  outOfStockBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  outOfStockNoticeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
  },
});
