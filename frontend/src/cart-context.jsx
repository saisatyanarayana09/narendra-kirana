import { createContext, useCallback, useContext, useEffect, useState } from 'react'
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

 
 const refreshCart = async () => {
   if (!isCustomer) return;
   const res = await api.get('/cart/');
   setCart(res.data);
 }

 const refreshFavorites = async () => {
   if (!isCustomer) return;
   const res = await api.get('/favorites/');
   setFavorites(res.data.results || res.data || []);
 }
 
 const refreshNotifications = async () => {
   if (!isCustomer) return;
   const res = await api.get('/notifications/');
   setNotifications(res.data.results || res.data || []);
 }

 const refresh = useCallback(async () => {
   if (!isCustomer) { setCart(null); setFavorites([]); setNotifications([]); return }
   // Run them independently so one slow request doesn't block the others
   refreshCart().catch(console.error);
   refreshFavorites().catch(console.error);
   refreshNotifications().catch(console.error);
 }, [isCustomer])

 useEffect(() => { 
    refresh();
    fetchSettings();
    fetchProfile();
    
    // Poll settings every 30s so store open/close is live
    const interval = setInterval(() => {
        fetchSettings();
    }, 30000);
    return () => clearInterval(interval);
  }, [refresh, fetchSettings, fetchProfile])

 const syncUser = useCallback(() => {
   setUser(getUser());
 }, []);

 const add = async (product) => { await api.post('/cart/items/', { product: product.id, quantity: 1 }); refreshCart().catch(console.error); }
 const update = async (item, quantity) => { if (quantity < 1) await api.delete(`/cart/items/${item.id}/`); else await api.patch(`/cart/items/${item.id}/`, { quantity }); refreshCart().catch(console.error); }
 
 const applyPromo = async (code) => {
   const response = await api.post('/cart/apply-promo/', { code });
   setCart(response.data);
 };

 const toggleFavorite = async (productId) => {
   if (!isCustomer) return;
   const isFav = favorites.find(f => f.product === productId);
   if (isFav) {
     await api.delete(`/favorites/${isFav.id}/`);
   } else {
     await api.post('/favorites/', { product: productId });
   }
   refreshFavorites().catch(console.error);
 };

 return (
   <CartContext.Provider value={{ cart, add, update, refresh, user, isCustomer, syncUser, applyPromo, storeSettings, favorites, toggleFavorite, notifications }}>
     {children}
   </CartContext.Provider>
 )
}

export function useCart() { return useContext(CartContext) }
