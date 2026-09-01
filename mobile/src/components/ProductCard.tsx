import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { fixImageUrl } from '../utils/image';
import { theme } from '../constants/theme';

interface Product {
  id: number;
  name: string;
  brand: string | null;
  price: string;
  mrp: string;
  unit: string;
  is_in_stock: boolean;
  stock_quantity: number;
  images: Array<{ id: number; image: string; is_primary: boolean }>;
}

interface Props {
  product: Product;
  onPress: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

const { width } = Dimensions.get('window');

export function ProductCard({ product, onPress, onAddToCart }: Props) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const discount = product.mrp && parseFloat(product.mrp) > parseFloat(product.price)
    ? Math.round(((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100)
    : 0;

  const primaryImage = product.images?.find(img => img.is_primary)?.image || product.images?.[0]?.image;
  const finalPrimaryImage = fixImageUrl(primaryImage);

  const handleAddToCart = () => {
    setAdding(true);
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => {
      setAdding(false);
      setAdded(false);
    }, 2000);
  };

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress(product)}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, !product.is_in_stock && styles.imageOutOfStock]}>
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Feather name="zap" size={10} color={theme.colors.surface} />
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}

        {finalPrimaryImage ? (
          <Image source={{ uri: finalPrimaryImage }} style={styles.image} contentFit="contain" />
        ) : (
          <View style={styles.placeholderImage} />
        )}

        {!product.is_in_stock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {product.brand && <Text style={styles.brand} numberOfLines={1}>{product.brand}</Text>}
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.unit}>{product.unit}</Text>
        
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>₹{parseFloat(product.price).toString()}</Text>
            {discount > 0 && (
              <Text style={styles.mrp}>₹{parseFloat(product.mrp).toString()}</Text>
            )}
          </View>
        </View>

        {product.is_in_stock ? (
          <TouchableOpacity 
            style={[styles.addToCartButton, added && styles.addedButton]}
            onPress={handleAddToCart}
            disabled={adding || added}
            activeOpacity={0.8}
          >
            {added ? (
              <Text style={styles.addedText}>✓ Added</Text>
            ) : adding ? (
              <Text style={styles.addToCartText}>Adding...</Text>
            ) : (
              <>
                <Feather name="shopping-cart" size={14} color="#FFF" style={{marginRight: 4}} />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.outOfStockButton}>
            <Text style={styles.outOfStockButtonText}>Out of stock</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    width: (width - 48) / 2,
    marginRight: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  imageContainer: {
    height: 140,
    backgroundColor: theme.colors.background,
    position: 'relative',
    padding: theme.spacing.sm,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
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
    backgroundColor: theme.colors.border,
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
    backgroundColor: 'theme.colors.primary',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  discountText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -45 }, { translateY: -12 }],
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    padding: 12,
    flex: 1,
    flexDirection: 'column',
  },
  brand: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600',
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    lineHeight: 18,
    marginBottom: 4,
    minHeight: 36,
  },
  unit: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  mrp: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  addToCartButton: {
    backgroundColor: 'theme.colors.primary',
    borderRadius: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 'auto',
  },
  addedButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  addedText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '800',
  },
  outOfStockButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 'auto',
  },
  outOfStockButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
});
