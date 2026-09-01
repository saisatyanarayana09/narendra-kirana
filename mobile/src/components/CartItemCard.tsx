import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { fixImageUrl } from '../utils/image';
import { theme } from '../constants/theme';
import { CartItem } from '../context/CartContext';
import { QuantitySelector } from './QuantitySelector';

interface Props {
  item: CartItem;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  isLoading?: boolean;
}

export function CartItemCard({ item, onUpdateQuantity, onRemove, isLoading }: Props) {
  const discount = item.product.mrp && parseFloat(item.product.mrp) > parseFloat(item.product.price) ? Math.round(((parseFloat(item.product.mrp) - parseFloat(item.product.price)) / parseFloat(item.product.mrp)) * 100) : 0;
  const primaryImage = fixImageUrl(item.product?.images?.find(img => img.is_primary)?.image || item.product?.images?.[0]?.image);

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage} />
        )}
      </View>
      
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>{item.product.name}</Text>
        
        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{item.product.price}</Text>
          {item.product.mrp && parseFloat(item.product.mrp) > parseFloat(item.product.price) && (
            <Text style={styles.mrp}>₹{item.product.mrp}</Text>
          )}
          {discount > 0 && (
            <View style={{ backgroundColor: theme.colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
              <Text style={{ color: theme.colors.primaryDark, fontSize: 12, fontWeight: 'bold' }}>{discount}% OFF</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <QuantitySelector 
            quantity={item.quantity}
            onDecrease={() => onUpdateQuantity(item.id, item.quantity - 1)}
            onIncrease={() => onUpdateQuantity(item.id, item.quantity + 1)}
            isLoading={isLoading}
          />
          <Text style={styles.subtotal}>₹{item.subtotal}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.deleteButton} 
        onPress={() => onRemove(item.id)}
        disabled={isLoading}
      >
        <Feather name="trash-2" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  imageContainer: {
    width: 70,
    height: 70,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    marginRight: theme.spacing.md,
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
  details: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  mrp: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
    marginLeft: theme.spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtotal: {
    fontSize: 15,
    fontWeight: '900',
    color: theme.colors.primaryDark,
  },
  deleteButton: {
    padding: 12,
    marginLeft: theme.spacing.sm,
    justifyContent: 'flex-start',
  },
});
