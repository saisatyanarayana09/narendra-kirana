import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { getGuestStorageItem, setGuestStorageItem, removeGuestStorageItem } from '../utils/guestStorage';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

export const GUEST_CART_KEY = 'smart_kirana_guest_cart';

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
  addToCart: (productId: number, quantity?: number, productDetails?: any) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  applyPromo: (code: string) => Promise<void>;
  removePromo: () => Promise<void>;
  refreshCart: () => Promise<void>;
  cartQuantityMap: Record<number, number>;
  getItemQuantity: (productId: number) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateGuestTotals = (items: CartItem[], packagingFeeStr: string = '0'): CartData => {
    let subtotalNum = 0;
    const computedItems = items.map((item) => {
      const priceNum = parseFloat(item.product?.price || item.unit_price || '0');
      const itemSub = priceNum * item.quantity;
      subtotalNum += itemSub;
      return {
        ...item,
        subtotal: itemSub.toFixed(2),
      };
    });

    const packagingFeeNum = parseFloat(packagingFeeStr || '0');
    const totalNum = subtotalNum + (subtotalNum > 0 ? packagingFeeNum : 0);

    return {
      items: computedItems,
      subtotal: subtotalNum.toFixed(2),
      discount: '0.00',
      promo_code: null,
      promo_discount: '0.00',
      packaging_fee: subtotalNum > 0 ? packagingFeeNum.toFixed(2) : '0.00',
      total: totalNum.toFixed(2),
    };
  };

  const loadGuestCart = async (): Promise<CartData | null> => {
    try {
      const raw = await getGuestStorageItem(GUEST_CART_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  // Sync / Merge Cart when user changes (login / logout)
  useEffect(() => {
    const syncUserCart = async () => {
      if (user) {
        try {
          const raw = await getGuestStorageItem(GUEST_CART_KEY);
          if (raw) {
            const guestCart = JSON.parse(raw);
            const guestItems = guestCart.items || [];
            if (guestItems.length > 0) {
              await apiClient
                .post('/cart/merge/', {
                  items: guestItems.map((i: any) => ({
                    product: i.product?.id || i.id,
                    quantity: i.quantity,
                  })),
                })
                .catch(() => null);
              await removeGuestStorageItem(GUEST_CART_KEY);
            }
          }
        } catch (e) {
          // Ignore merge sync error
        }
        await refreshCart();
      } else {
        const guestCart = await loadGuestCart();
        setCart(
          guestCart || {
            items: [],
            subtotal: '0.00',
            discount: '0.00',
            promo_code: null,
            promo_discount: '0.00',
            packaging_fee: '0.00',
            total: '0.00',
          }
        );
      }
    };

    syncUserCart();
  }, [user?.id]);

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

  const refreshCart = useCallback(async () => {
    if (!user) {
      const guestCart = await loadGuestCart();
      if (guestCart) {
        setCart(guestCart);
      } else {
        setCart({
          items: [],
          subtotal: '0.00',
          discount: '0.00',
          promo_code: null,
          promo_discount: '0.00',
          packaging_fee: '0.00',
          total: '0.00',
        });
      }
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiClient.get('/cart/');
      if (res?.data) {
        setCart(res.data);
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status !== 403 && status !== 401) {
        console.error('Failed to fetch cart:', error);
      } else {
        console.warn(`[CartContext] Cart fetch returned status ${status}.`);
      }
      // Ensure cart is at least initialized so screens don't crash
      setCart((prev) => prev || {
        items: [],
        subtotal: '0.00',
        discount: '0.00',
        promo_code: null,
        promo_discount: '0.00',
        packaging_fee: '0.00',
        total: '0.00',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const addToCart = async (productId: number, quantity: number = 1, productDetails?: any) => {
    if (!user) {
      try {
        setIsLoading(true);
        const currentCart = (await loadGuestCart()) || {
          items: [],
          subtotal: '0.00',
          discount: '0.00',
          promo_code: null,
          promo_discount: '0.00',
          packaging_fee: '0.00',
          total: '0.00',
        };

        const existingItemIndex = currentCart.items.findIndex(
          (item) => (item.product?.id || item.id) === productId
        );

        let updatedItems = [...currentCart.items];

        if (existingItemIndex > -1) {
          const existingItem = updatedItems[existingItemIndex];
          const newQty = existingItem.quantity + quantity;
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQty,
          };
        } else {
          // New item: resolve product details
          let details = productDetails;
          if (!details || !details.price) {
            try {
              const res = await apiClient.get(`/products/${productId}/`);
              details = res.data;
            } catch {
              details = {
                id: productId,
                name: 'Product',
                price: '0.00',
                mrp: null,
                is_in_stock: true,
                image: null,
              };
            }
          }

          const newItem: CartItem = {
            id: productId,
            product: {
              id: productId,
              name: details.name || 'Product',
              price: String(details.price || '0'),
              mrp: details.mrp ? String(details.mrp) : null,
              is_in_stock: details.is_in_stock !== false,
              image: details.image || details.primary_image || null,
              unit: details.unit || 'pack',
              stock_quantity: details.stock_quantity,
              max_order_quantity: details.max_order_quantity,
            },
            quantity,
            subtotal: (parseFloat(details.price || '0') * quantity).toFixed(2),
            product_name: details.name,
            product_unit: details.unit,
            product_image: details.image || details.primary_image || null,
            unit_price: String(details.price || '0'),
          };
          updatedItems.push(newItem);
        }

        const packagingFee = storeSettings?.packaging_fee || '0';
        const newCartData = calculateGuestTotals(updatedItems, packagingFee);
        await setGuestStorageItem(GUEST_CART_KEY, JSON.stringify(newCartData));
        setCart(newCartData);
      } catch (error) {
        console.error('Failed to add to guest cart:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      setIsLoading(true);

      if (cart) {
        const existingItem = cart.items?.find((item) => item.product?.id === productId);
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

    if (!user) {
      try {
        setIsLoading(true);
        const currentCart = (await loadGuestCart()) || cart;
        if (!currentCart) return;

        const updatedItems = currentCart.items.map((item) => {
          if (item.id === itemId || item.product?.id === itemId) {
            return {
              ...item,
              quantity,
            };
          }
          return item;
        });

        const packagingFee = storeSettings?.packaging_fee || '0';
        const newCartData = calculateGuestTotals(updatedItems, packagingFee);
        await setGuestStorageItem(GUEST_CART_KEY, JSON.stringify(newCartData));
        setCart(newCartData);
      } catch (error) {
        console.error('Failed to update guest cart quantity:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
      return;
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
    if (!user) {
      try {
        setIsLoading(true);
        const currentCart = (await loadGuestCart()) || cart;
        if (!currentCart) return;

        const updatedItems = currentCart.items.filter(
          (item) => item.id !== itemId && item.product?.id !== itemId
        );

        const packagingFee = storeSettings?.packaging_fee || '0';
        const newCartData = calculateGuestTotals(updatedItems, packagingFee);
        await setGuestStorageItem(GUEST_CART_KEY, JSON.stringify(newCartData));
        setCart(newCartData);
      } catch (error) {
        console.error('Failed to remove from guest cart:', error);
        throw error;
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
    if (!user) {
      throw new Error('Please sign in to apply promo codes');
    }
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

  const cartQuantityMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (cart?.items) {
      for (const item of cart.items) {
        const pId = item.product?.id ?? item.product;
        if (pId != null) {
          map[Number(pId)] = item.quantity;
        }
      }
    }
    return map;
  }, [cart?.items]);

  const getItemQuantity = useCallback((productId: number): number => {
    return cartQuantityMap[productId] || 0;
  }, [cartQuantityMap]);

  const contextValue = useMemo(() => ({
    cart,
    isLoading,
    storeSettings,
    addToCart,
    updateQuantity,
    removeFromCart,
    applyPromo,
    removePromo,
    refreshCart,
    cartQuantityMap,
    getItemQuantity,
  }), [
    cart,
    isLoading,
    storeSettings,
    addToCart,
    updateQuantity,
    removeFromCart,
    applyPromo,
    removePromo,
    refreshCart,
    cartQuantityMap,
    getItemQuantity,
  ]);

  return (
    <CartContext.Provider value={contextValue}>
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
