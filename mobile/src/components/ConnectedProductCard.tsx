import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ProductCard, Product } from './ProductCard';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { favoritesService } from '../services/favoritesService';
import { AppNavigationProp } from '../navigation/types';

interface Props {
  product: Product;
}

export const ConnectedProductCard = React.memo(({ product }: Props) => {
  const { cartQuantityMap, addToCart } = useCart();
  const { user } = useAuth();
  const navigation = useNavigation<AppNavigationProp>();
  
  const [isFavorite, setIsFavorite] = useState(favoritesService.getFavoriteIds().has(product.id));

  useEffect(() => {
    const handleFavChange = () => {
      setIsFavorite(favoritesService.getFavoriteIds().has(product.id));
    };
    const unsub = favoritesService.subscribe(handleFavChange);
    return unsub;
  }, [product.id]);

  const handleProductPress = () => {
    navigation.navigate("ProductDetailScreen", {
      productId: product.id,
      initialProduct: product,
    });
  };

  const handleToggleFavorite = () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to save your favorite products.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => navigation.navigate("Login") },
        ],
      );
      return;
    }
    favoritesService.toggleFavorite(product.id);
  };

  const handleAddToCart = () => {
    addToCart(product.id, 1, product);
  };

  return (
    <ProductCard
      product={product}
      onPress={handleProductPress}
      onAddToCart={handleAddToCart}
      cartQty={cartQuantityMap[product.id] || 0}
      isFavorite={isFavorite}
      onToggleFavorite={handleToggleFavorite}
    />
  );
});
