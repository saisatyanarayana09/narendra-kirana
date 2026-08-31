import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ShoppingCart } from 'lucide-react-native';
import { theme } from '../constants/theme';

interface Product {
  id: number;
  name: string;
  brand: string | null;
  price: string;
  mrp: string | null;
  images: Array<{ id: number; image: string; is_primary: boolean }>;
  is_in_stock: boolean;
  unit: string;
}

interface Props {
  product: Product;
  onPress: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onPress, onAddToCart }: Props) {
  const primaryImage = product.images.find(img => img.is_primary)?.image || product.images[0]?.image;
  
  const discount = product.mrp && parseFloat(product.mrp) > parseFloat(product.price)
    ? Math.round(((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100)
    : 0;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(product)}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderImage} />
        )}
        
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {product.brand && (
          <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>
        )}
        
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit}</Text>
        
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
              <Text style={styles.mrp}>₹{product.mrp}</Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.addButton, !product.is_in_stock && styles.addButtonDisabled]}
            disabled={!product.is_in_stock}
            onPress={() => onAddToCart && onAddToCart(product)}
          >
            {product.is_in_stock ? (
              <ShoppingCart size={18} color={theme.colors.surface} />
            ) : (
              <Text style={styles.outOfStockText}>Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    width: 160,
    marginRight: theme.spacing.md,
  },
  imageContainer: {
    height: 140,
    backgroundColor: theme.colors.background,
    position: 'relative',
    padding: theme.spacing.sm,
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
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  discountText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    padding: theme.spacing.sm,
  },
  brand: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    height: 36,
    lineHeight: 18,
  },
  unit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  mrp: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  outOfStockText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
  },
});
