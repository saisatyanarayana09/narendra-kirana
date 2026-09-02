import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: number;
  product: {
    id: number;
    name: string;
    price: string;
    mrp: string | null;
    is_in_stock: boolean;
    image: string | null;
    unit?: string;
    stock_quantity?: number;
    max_order_quantity?: number;
    [key: string]: any;
  };
  quantity: number;
  subtotal: string;
  product_name?: string;
  product_unit?: string;
  product_image?: string | null;
  stock_quantity?: number;
  max_order_quantity?: number;
  unit_price?: string;
}

export interface CartData {
  id?: number;
  items: CartItem[];
  subtotal: string;
  discount: string;
  promo_code: string | null;
  promo_discount: string;
  packaging_fee: string;
  total: string;
}

interface CartContextType {
  cart: CartData | null;
  isLoading: boolean;
  storeSettings: any;
  addToCart: (productId: number, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  applyPromo: (code: string) => Promise<void>;
  removePromo: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  useEffect(() => {
    if (user) {
      refreshCart();
    } else {
      setCart(null);
    }
  }, [user]);

  const fetchStoreSettings = async () => {
    try {
      const res = await apiClient.get('/store/settings/').catch(() => null);
      if (res?.data) {
        setStoreSettings(Array.isArray(res.data) ? res.data[0] : res.data);
      }
    } catch (err) {
      console.error('Failed to fetch store settings', err);
    }
  };

  const refreshCart = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/cart/');
      setCart(res.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (productId: number, quantity: number = 1) => {
    try {
      setIsLoading(true);
      
      // Check if product is already in cart locally to update instead
      if (cart) {
        const existingItem = cart.items?.find(item => item.product?.id === productId);
        if (existingItem) {
          await updateQuantity(existingItem.id, existingItem.quantity + quantity);
          return;
        }
      }

      await apiClient.post('/cart/items/', { product: productId, quantity });
      await refreshCart();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(itemId);
    }
    
    try {
      setIsLoading(true);
      await apiClient.patch(`/cart/items/${itemId}/`, { quantity });
      await refreshCart();
    } catch (error) {
      console.error('Failed to update quantity:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: number) => {
    try {
      setIsLoading(true);
      await apiClient.delete(`/cart/items/${itemId}/`);
      await refreshCart();
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const applyPromo = async (code: string) => {
    try {
      setIsLoading(true);
      await apiClient.post('/cart/apply-promo/', { code });
      await refreshCart();
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removePromo = async () => {
    try {
      setIsLoading(true);
      await apiClient.post('/cart/apply-promo/', { code: '' });
      await refreshCart();
    } catch (error) {
      console.error('Failed to remove promo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider 
      value={{ 
        cart, 
        isLoading, 
        storeSettings,
        addToCart, 
        updateQuantity, 
        removeFromCart, 
        applyPromo, 
        removePromo,
        refreshCart 
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
