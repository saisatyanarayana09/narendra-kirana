import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from './services/api'

const CartContext = createContext(null)
const getUser = () => JSON.parse(localStorage.getItem('smart-kirana-customer-user') || 'null')

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

 const refreshFavorites = useCallback(async () => {
   if (!isCustomer) return;
   const res = await api.get('/favorites/');
   setFavorites(res.data.results || res.data || []);
 }, [isCustomer])
 
 const refreshNotifications = useCallback(async () => {
   if (!isCustomer) return;
   const res = await api.get('/notifications/');
   setNotifications(res.data.results || res.data || []);
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
    
    // Poll settings every 60s (reduced from 30s — settings rarely change)
    const interval = setInterval(() => {
        // Skip polling when tab is not visible to save bandwidth
        if (!document.hidden) fetchSettings();
    }, 60000);
    return () => clearInterval(interval);
  }, [refresh, fetchSettings, fetchProfile])

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
      localStorage.removeItem('smart-kirana-customer-token');
      localStorage.removeItem('smart-kirana-customer-refresh');
      localStorage.removeItem('smart-kirana-customer-user');
      sessionStorage.removeItem('welcome_shown_time');
      sessionStorage.removeItem('hasShownWelcome');
      setUser(null);
      setCart(null);
      setFavorites([]);
      setNotifications([]);
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
   cart, add, update, refresh, user, isCustomer, syncUser, logout,
   applyPromo, storeSettings, favorites, toggleFavorite, notifications
 }), [cart, add, update, refresh, user, isCustomer, syncUser, logout,
      applyPromo, storeSettings, favorites, toggleFavorite, notifications])

 return (
   <CartContext.Provider value={value}>
     {children}
   </CartContext.Provider>
 )
}

export function useCart() { return useContext(CartContext) }
