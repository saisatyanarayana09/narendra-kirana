import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api, { clearUserCache } from './services/api'

const CartContext = createContext(null)
const getUser = () => JSON.parse(localStorage.getItem('smart-kirana-customer-user') || 'null')

// Module-level cache to track dispatched notifications without hook dependencies
const seenNotificationIds = new Set();
let hasLoadedInitialNotifications = false;

export function CartProvider({ children }) {
 const [cart, setCart] = useState(null)
 const [user, setUser] = useState(getUser)
 const [storeSettings, setStoreSettings] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [notifications, setNotifications] = useState([])
  const cartRef = useRef(cart)
  const cartMutationQueue = useRef(Promise.resolve())
  const cartMutationVersion = useRef(0)

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  const replaceCart = useCallback((nextCart) => {
    cartRef.current = nextCart
    setCart(nextCart)
  }, [])

  // Cart mutation responses contain every line item. Serialize writes and only
  // let the newest response replace optimistic state, preventing late responses
  // from undoing a rapid + / - sequence.
  const enqueueCartMutation = useCallback((mutation) => {
    const version = ++cartMutationVersion.current
    const previous = cartMutationQueue.current
    const next = previous.catch(() => undefined).then(() => mutation(version))
    cartMutationQueue.current = next

    void next.finally(() => {
      if (cartMutationQueue.current === next) cartMutationQueue.current = Promise.resolve()
    }).catch(() => undefined)

    return next
  }, [])
 
 const isCustomer = Boolean(user?.is_customer)

 const fetchSettings = useCallback(async () => {
   try {
     const response = await api.get('/store/settings/');
     setStoreSettings(response.data);
   } catch (e) { console.error('Failed to load store settings'); }
 }, [])

 const fetchProfile = useCallback(async () => {
   if (!isCustomer) return;
   try {
     const response = await api.get('/auth/profile/');
     localStorage.setItem('smart-kirana-customer-user', JSON.stringify(response.data));
     setUser(response.data);
   } catch (e) { console.error('Failed to load profile'); }
 }, [isCustomer]);

 
  const refreshCart = useCallback(async () => {
    if (!isCustomer) return;
    const refreshVersion = cartMutationVersion.current;
    const res = await api.get('/cart/');
    if (refreshVersion === cartMutationVersion.current) replaceCart(res.data);
  }, [isCustomer, replaceCart])

  const [notificationPermission, setNotificationPermission] = useState(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
  });

  const requestWebPushPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        return perm;
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
    return 'denied';
  }, []);

  const refreshFavorites = useCallback(async () => {
    if (!isCustomer) return;
    const res = await api.get('/favorites/');
    setFavorites(res.data.results || res.data || []);
  }, [isCustomer])
  
  const refreshNotifications = useCallback(async () => {
    if (!isCustomer) return;
    try {
      const res = await api.get('/notifications/');
      const list = res.data.results || res.data || [];
      setNotifications(list);

      if (!hasLoadedInitialNotifications) {
        list.forEach(n => seenNotificationIds.add(n.id));
        hasLoadedInitialNotifications = true;
      } else {
        list.forEach(n => {
          if (!seenNotificationIds.has(n.id)) {
            seenNotificationIds.add(n.id);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(n.title || 'Narendra Kirana Alert', {
                  body: n.message || '',
                  icon: '/favicon.ico',
                  tag: `nk-${n.id}`
                });
              } catch (e) {
                console.warn('Browser notification error:', e);
              }
            }
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  }, [isCustomer])

  const refresh = useCallback(async () => {
    if (!isCustomer) { replaceCart(null); setFavorites([]); setNotifications([]); return }
    // Run them independently so one slow request doesn't block the others
    refreshCart().catch(console.error);
    refreshFavorites().catch(console.error);
    refreshNotifications().catch(console.error);
  }, [isCustomer, refreshCart, refreshFavorites, refreshNotifications, replaceCart])

  useEffect(() => { 
     refresh();
     fetchSettings();
     fetchProfile();
     
     // Poll settings every 60s
     const interval = setInterval(() => {
         if (!document.hidden) fetchSettings();
     }, 60000);

     // Poll active notifications every 12s when tab is active
     const notifInterval = setInterval(() => {
         if (!document.hidden && isCustomer) {
           refreshNotifications();
         }
     }, 12000);

     return () => {
       clearInterval(interval);
       clearInterval(notifInterval);
     };
   }, [refresh, fetchSettings, fetchProfile, isCustomer, refreshNotifications])

 const syncUser = useCallback(() => {
   setUser(getUser());
 }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem('smart-kirana-customer-refresh');
    
    // Fire and forget backend logout
    if (refresh) {
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    
    try {
      localStorage.removeItem('smart-kirana-customer-token');
      localStorage.removeItem('smart-kirana-customer-refresh');
      localStorage.removeItem('smart-kirana-customer-user');
      sessionStorage.removeItem('welcome_shown_time');
      sessionStorage.removeItem('hasShownWelcome');
      clearUserCache();
    } catch {
      // Storage restricted or unavailable
    }
    setUser(null);
    replaceCart(null);
    setFavorites([]);
    setNotifications([]);
    seenNotificationIds.clear();
    hasLoadedInitialNotifications = false;
    window.location.href = '/';
  }, [replaceCart]);

  const add = useCallback(async (product) => {
    await enqueueCartMutation(async (version) => {
      const response = await api.post('/cart/items/', { product: product.id, quantity: 1 });
      if (version === cartMutationVersion.current) replaceCart(response.data);
    });
  }, [enqueueCartMutation, replaceCart])

  const update = useCallback(async (item, quantity) => {
    const previousCart = cartRef.current;
    const mutationVersion = cartMutationVersion.current + 1;
    setCart((current) => {
      if (!current?.items) return current;
      const items = quantity < 1
        ? { ...current, items: current.items.filter((cartItem) => cartItem.id !== item.id) }
        : {
            ...current,
            items: current.items.map((cartItem) => (
              cartItem.id === item.id
                ? { ...cartItem, quantity, subtotal: (Number(cartItem.unit_price || 0) * quantity).toFixed(2) }
              : cartItem
            )),
          };
      const nextItems = items.items;
      const itemsTotal = nextItems.reduce((total, cartItem) => total + Number(cartItem.unit_price || 0) * cartItem.quantity, 0);
      const regularTotal = nextItems.reduce(
        (total, cartItem) => total + Number(cartItem.regular_price || cartItem.unit_price || 0) * cartItem.quantity,
        0,
      );
      const packagingFee = nextItems.length ? Number(current.packaging_fee || 0) : 0;
      const promoDiscount = Math.min(Number(current.promo_discount || 0), itemsTotal);
      const nextCart = {
        ...items,
        subtotal: regularTotal.toFixed(2),
        items_total: itemsTotal.toFixed(2),
        discount: Math.max(0, regularTotal - itemsTotal).toFixed(2),
        packaging_fee: packagingFee.toFixed(2),
        total: (Math.max(0, itemsTotal - promoDiscount) + packagingFee).toFixed(2),
      };
      cartRef.current = nextCart;
      return nextCart;
    });

    try {
      await enqueueCartMutation(async (version) => {
        const response = quantity < 1
          ? await api.delete(`/cart/items/${item.id}/`)
          : await api.patch(`/cart/items/${item.id}/`, { quantity });
        if (version === cartMutationVersion.current) replaceCart(response.data);
      });
    } catch (error) {
      if (previousCart && cartMutationVersion.current === mutationVersion) replaceCart(previousCart);
      throw error;
    }
  }, [enqueueCartMutation, replaceCart])
  const clearCart = useCallback(async () => {
    if (!isCustomer) return;
    try {
      await enqueueCartMutation(async (version) => {
        const response = await api.post('/cart/clear/');
        if (version === cartMutationVersion.current) replaceCart(response.data);
      });
    } catch {
      // ignore
    }
  }, [isCustomer, enqueueCartMutation, replaceCart]);

  const applyPromo = useCallback(async (code) => {
    await enqueueCartMutation(async (version) => {
      const response = await api.post('/cart/apply-promo/', { code });
      if (version === cartMutationVersion.current) replaceCart(response.data);
    });
  }, [enqueueCartMutation, replaceCart])

  const toggleFavorite = useCallback(async (productId) => {
    if (!isCustomer) return;
    const numId = Number(productId);
    const isFav = favorites.find(f => 
      Number(f.product) === numId || 
      Number(f.product?.id) === numId || 
      Number(f.product_details?.id) === numId
    );
    try {
      if (isFav?.id) {
        await api.delete(`/favorites/${isFav.id}/`).catch(() =>
          api.post('/favorites/toggle/', { product: numId })
        );
      } else {
        await api.post('/favorites/', { product: numId });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
    refreshFavorites().catch(console.error);
  }, [isCustomer, favorites, refreshFavorites])

 // Memoize the context value to prevent unnecessary re-renders of all consumers
 const value = useMemo(() => ({
   cart, add, update, clearCart, refresh, user, isCustomer, syncUser, logout,
   applyPromo, storeSettings, favorites, toggleFavorite, notifications,
   notificationPermission, requestWebPushPermission
 }), [cart, add, update, clearCart, refresh, user, isCustomer, syncUser, logout,
      applyPromo, storeSettings, favorites, toggleFavorite, notifications,
      notificationPermission, requestWebPushPermission])

 return (
   <CartContext.Provider value={value}>
     {children}
   </CartContext.Provider>
 )
}

export function useCart() { return useContext(CartContext) }
