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

 const refresh = useCallback(async () => {
   if (!isCustomer) { setCart(null); setFavorites([]); return }
   const [cartRes, favRes, notifRes] = await Promise.all([
     api.get('/cart/'),
     api.get('/favorites/'),
     api.get('/notifications/')
   ]);
   setCart(cartRes.data)
   setFavorites(favRes.data.results || favRes.data || [])
   setNotifications(notifRes.data.results || notifRes.data || [])
 }, [isCustomer])

 useEffect(() => { 
   refresh().catch(() => { setCart(null); setFavorites([]); setNotifications([]); });
   fetchSettings();
   fetchProfile();
 }, [refresh, fetchSettings, fetchProfile])

 const syncUser = useCallback(() => {
   setUser(getUser());
 }, []);

 const add = async (product) => { await api.post('/cart/items/', { product: product.id, quantity: 1 }); await refresh() }
 const update = async (item, quantity) => { if (quantity < 1) await api.delete(`/cart/items/${item.id}/`); else await api.patch(`/cart/items/${item.id}/`, { quantity }); await refresh() }
 
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
   await refresh();
 };

 return (
   <CartContext.Provider value={{ cart, add, update, refresh, user, isCustomer, syncUser, applyPromo, storeSettings, favorites, toggleFavorite, notifications }}>
     {children}
   </CartContext.Provider>
 )
}

export function useCart() { return useContext(CartContext) }
