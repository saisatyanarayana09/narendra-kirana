import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { fixImageUrl } from '../utils/image';
import { CartItem } from '../context/CartContext';

interface Props {
  item: CartItem;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  isLoading?: boolean;
}

export function CartItemCard({ item, onUpdateQuantity, onRemove, isLoading }: Props) {
  const maxOrderQty = item.max_order_quantity ?? item.product?.max_order_quantity ?? 0;
  const stockQty = item.stock_quantity ?? item.product?.stock_quantity ?? 999;
  const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
  const isMaxReached = item.quantity >= maxAllowed;

  const rawImage = item.product_image || item.product?.image;
  const primaryImage = fixImageUrl(rawImage);
  const productName = item.product_name || item.product?.name || 'Product';
  const unitPrice = item.unit_price || item.product?.price || '0.00';
  const unitName = item.product_unit || item.product?.unit || 'Unit';

  return (
    <View style={styles.container}>
      {/* Product Image / Initial Placeholder */}
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.image} contentFit="contain" />
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderLetter}>
              {productName.charAt(0)?.toUpperCase() || 'P'}
            </Text>
          </View>
        )}
      </View>
      
      {/* Product Details */}
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>{productName}</Text>
        <Text style={styles.unitText}>
          ₹{unitPrice} · {unitName}
        </Text>
        {isMaxReached && (
          <Text style={styles.limitReachedText}>
            {maxOrderQty > 0 && maxOrderQty <= stockQty 
              ? `Max limit of ${maxAllowed} reached`
              : `Only ${maxAllowed} in stock`}
          </Text>
        )}
      </View>

      {/* Quantity Selector Stepper matching web app */}
      <View style={styles.stepperContainer}>
        <TouchableOpacity 
          style={styles.stepperButton}
          onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Feather name="minus" size={16} color="#334155" />
        </TouchableOpacity>

        <Text style={styles.quantityText}>{item.quantity}</Text>

        <TouchableOpacity 
          style={[styles.stepperButton, isMaxReached && styles.disabledStepperBtn]}
          onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={isMaxReached || isLoading}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={16} color={isMaxReached ? "#CBD5E1" : "#334155"} />
        </TouchableOpacity>
      </View>

      {/* Delete / Trash Button */}
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => onRemove(item.id)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Feather name="trash-2" size={18} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
}

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
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
    fontWeight: '700',
    color: '#0F172A', // slate-900
    marginBottom: 2,
  },
  unitText: {
    fontSize: 13,
    color: '#64748B', // slate-500
    fontWeight: '500',
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
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
