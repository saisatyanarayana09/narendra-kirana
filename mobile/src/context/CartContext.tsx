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
  is_in_stock?: boolean;
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

export interface CartContextType {
  cart: CartData | null;
  isLoading: boolean;
  storeSettings: any;
  addToCart: (productId: number, quantity?: number, productDetails?: any) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeFromCart: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  applyPromo: (code: string) => Promise<void>;
  removePromo: () => Promise<void>;
  refreshCart: () => Promise<void>;
  cartQuantityMap: Record<number, number>;
  getItemQuantity: (productId: number) => number;
}

export const getItemProductId = (item: CartItem): number => {
  if (typeof item.product === 'object' && item.product !== null) {
    return Number(item.product.id);
  }
  if (typeof item.product === 'number') {
    return item.product;
  }
  return Number(item.id);
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const calculateGuestTotals = (items: CartItem[], packagingFeeStr: string = '0'): CartData => {
    let regularTotalNum = 0;
    let offerTotalNum = 0;

    const computedItems = items.map((item) => {
      const offerPriceNum = parseFloat(item.unit_price || item.product?.price || '0');
      const regularPriceNum = parseFloat(
        item.product?.mrp || item.product?.regular_price || item.unit_price || item.product?.price || '0'
      );
      const itemSub = offerPriceNum * item.quantity;
      regularTotalNum += regularPriceNum * item.quantity;
      offerTotalNum += itemSub;

      return {
        ...item,
        subtotal: itemSub.toFixed(2),
      };
    });

    const discountNum = Math.max(0, regularTotalNum - offerTotalNum);
    const packagingFeeNum = parseFloat(packagingFeeStr || '0');
    const totalNum = offerTotalNum + (offerTotalNum > 0 ? packagingFeeNum : 0);

    return {
      items: computedItems,
      subtotal: regularTotalNum > 0 ? regularTotalNum.toFixed(2) : offerTotalNum.toFixed(2),
      discount: discountNum.toFixed(2),
      promo_code: null,
      promo_discount: '0.00',
      packaging_fee: offerTotalNum > 0 ? packagingFeeNum.toFixed(2) : '0.00',
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
              const res = await apiClient.post('/cart/merge/', {
                items: guestItems.map((i: any) => ({
                  product: getItemProductId(i),
                  quantity: i.quantity,
                })),
              });
              if (res?.status >= 200 && res?.status < 300) {
                await removeGuestStorageItem(GUEST_CART_KEY);
              }
            }
          }
        } catch (e) {
          console.warn('[CartContext] Cart merge error:', e);
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
      } else if (status === 403) {
        console.warn('[CartContext] Cart fetch returned status 403.');
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
          (item) => getItemProductId(item) === productId
        );

        let updatedItems = [...currentCart.items];

        if (existingItemIndex > -1) {
          const existingItem = updatedItems[existingItemIndex];
          const stockLimit = existingItem.stock_quantity ?? existingItem.product?.stock_quantity ?? 999;
          const maxOrderLimit = existingItem.max_order_quantity ?? existingItem.product?.max_order_quantity ?? 0;
          const cap = maxOrderLimit > 0 ? Math.min(stockLimit, maxOrderLimit) : stockLimit;
          const newQty = Math.min(existingItem.quantity + quantity, cap);
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

          const stockLimit = details.stock_quantity ?? 999;
          const maxOrderLimit = details.max_order_quantity ?? 0;
          const cap = maxOrderLimit > 0 ? Math.min(stockLimit, maxOrderLimit) : stockLimit;
          const safeQty = Math.min(quantity, cap);

          const newItem: CartItem = {
            id: productId,
            product: {
              id: productId,
              name: details.name || 'Product',
              price: String(details.offer_price || details.price || '0'),
              mrp: details.regular_price || details.mrp ? String(details.regular_price || details.mrp) : null,
              is_in_stock: details.is_in_stock !== false,
              image: details.image || details.primary_image || null,
              unit: details.unit || 'pack',
              stock_quantity: details.stock_quantity,
              max_order_quantity: details.max_order_quantity,
            },
            quantity: safeQty,
            subtotal: (parseFloat(details.offer_price || details.price || '0') * safeQty).toFixed(2),
            product_name: details.name,
            product_unit: details.unit,
            product_image: details.image || details.primary_image || null,
            stock_quantity: details.stock_quantity,
            max_order_quantity: details.max_order_quantity,
            unit_price: String(details.offer_price || details.price || '0'),
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

      if (cart?.items) {
        const existingItem = cart.items.find((item) => getItemProductId(item) === productId);
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
        const currentCart = (await loadGuestCart()) || cart;
        if (!currentCart) return;

        const updatedItems = currentCart.items.map((item) => {
          if (item.id === itemId || getItemProductId(item) === itemId) {
            const stockLimit = item.stock_quantity ?? item.product?.stock_quantity ?? 999;
            const maxOrderLimit = item.max_order_quantity ?? item.product?.max_order_quantity ?? 0;
            const cap = maxOrderLimit > 0 ? Math.min(stockLimit, maxOrderLimit) : stockLimit;
            const safeQty = Math.min(quantity, cap);
            return {
              ...item,
              quantity: safeQty,
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
      }
      return;
    }

    // Optimistic update for instant responsiveness
    const prevCart = cart;
    if (cart?.items) {
      const updatedItems = cart.items.map((item) => {
        if (item.id === itemId) {
          const unitPriceNum = parseFloat(item.unit_price || item.product?.price || '0');
          return {
            ...item,
            quantity,
            subtotal: (unitPriceNum * quantity).toFixed(2),
          };
        }
        return item;
      });

      let newOfferSubtotal = 0;
      let newRegularSubtotal = 0;
      updatedItems.forEach((i) => {
        const offerP = parseFloat(i.unit_price || i.product?.price || '0');
        const regP = parseFloat(i.product?.mrp || i.product?.regular_price || i.unit_price || i.product?.price || '0');
        newOfferSubtotal += offerP * i.quantity;
        newRegularSubtotal += regP * i.quantity;
      });
      const packaging = parseFloat(cart.packaging_fee || '0');
      const promo = parseFloat(cart.promo_discount || '0');
      const newTotal = Math.max(0, newOfferSubtotal - promo) + (newOfferSubtotal > 0 ? packaging : 0);

      setCart({
        ...cart,
        items: updatedItems,
        subtotal: newRegularSubtotal > 0 ? newRegularSubtotal.toFixed(2) : newOfferSubtotal.toFixed(2),
        discount: Math.max(0, newRegularSubtotal - newOfferSubtotal).toFixed(2),
        total: newTotal.toFixed(2),
      });
    }

    try {
      await apiClient.patch(`/cart/items/${itemId}/`, { quantity });
      await refreshCart();
    } catch (error: any) {
      // Rollback on failure
      if (prevCart) setCart(prevCart);
      console.error('Failed to update quantity:', error);
      throw error;
    }
  };

  const removeFromCart = async (itemId: number) => {
    if (!user) {
      try {
        const currentCart = (await loadGuestCart()) || cart;
        if (!currentCart) return;

        const updatedItems = currentCart.items.filter(
          (item) => item.id !== itemId && getItemProductId(item) !== itemId
        );

        const packagingFee = storeSettings?.packaging_fee || '0';
        const newCartData = calculateGuestTotals(updatedItems, packagingFee);
        await setGuestStorageItem(GUEST_CART_KEY, JSON.stringify(newCartData));
        setCart(newCartData);
      } catch (error) {
        console.error('Failed to remove from guest cart:', error);
        throw error;
      }
      return;
    }

    // Optimistic removal
    const prevCart = cart;
    if (cart?.items) {
      const updatedItems = cart.items.filter((item) => item.id !== itemId);
      setCart({
        ...cart,
        items: updatedItems,
      });
    }

    try {
      await apiClient.delete(`/cart/items/${itemId}/`);
      await refreshCart();
    } catch (error) {
      if (prevCart) setCart(prevCart);
      console.error('Failed to remove from cart:', error);
      throw error;
    }
  };

  const clearCart = async () => {
    if (!user) {
      await removeGuestStorageItem(GUEST_CART_KEY);
      setCart({
        items: [],
        subtotal: '0.00',
        discount: '0.00',
        promo_code: null,
        promo_discount: '0.00',
        packaging_fee: '0.00',
        total: '0.00',
      });
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post('/cart/clear/').catch(() => null);
      await refreshCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
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
        const pId = getItemProductId(item);
        if (pId != null) {
          map[pId] = item.quantity;
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
    clearCart,
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
    clearCart,
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
