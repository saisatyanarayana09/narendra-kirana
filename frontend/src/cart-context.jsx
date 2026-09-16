import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
   const res = await api.get('/cart/');
   setCart(res.data);
 }, [isCustomer])

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
    if (!isCustomer) { setCart(null); setFavorites([]); setNotifications([]); return }
    // Run them independently so one slow request doesn't block the others
    refreshCart().catch(console.error);
    refreshFavorites().catch(console.error);
    refreshNotifications().catch(console.error);
  }, [isCustomer, refreshCart, refreshFavorites, refreshNotifications])

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
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
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
      setCart(null);
      setFavorites([]);
      setNotifications([]);
      seenNotificationIds.clear();
      hasLoadedInitialNotifications = false;
      window.location.href = '/';
    }
  }, []);

 const add = useCallback(async (product) => {
   await api.post('/cart/items/', { product: product.id, quantity: 1 });
   refreshCart().catch(console.error);
 }, [refreshCart])

 const update = useCallback(async (item, quantity) => {
   if (quantity < 1) await api.delete(`/cart/items/${item.id}/`);
   else await api.patch(`/cart/items/${item.id}/`, { quantity });
   refreshCart().catch(console.error);
 }, [refreshCart])
  const clearCart = useCallback(async () => {
    if (!isCustomer) return;
    try {
      await api.post('/cart/clear/');
    } catch {
      // ignore
    }
    refreshCart().catch(console.error);
  }, [isCustomer, refreshCart]);

  const applyPromo = useCallback(async (code) => {
    const response = await api.post('/cart/apply-promo/', { code });
    setCart(response.data);
  }, [])

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
