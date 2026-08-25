import { optimizeImage } from './utils/image';
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, ShoppingBasket, ShoppingCart, User, X, Heart, Bell, LayoutGrid, Trash2, ShoppingBag, Leaf, Coffee, Package } from 'lucide-react'
import { useCart } from './cart-context'
import api from './services/api'

function GlobalSearchBar() {
 const [query, setQuery] = useState('');
 const [results, setResults] = useState([]);
 const [isOpen, setIsOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();
 const wrapperRef = useRef(null);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
 setIsOpen(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 useEffect(() => {
 const timer = setTimeout(() => {
 if (query.trim().length > 1) {
 setLoading(true);
 api.get(`/products/?search=${encodeURIComponent(query)}`)
 .then(res => {
 setResults(res.data.results?.slice(0, 5) || res.data?.slice(0, 5) || []);
 setIsOpen(true);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 } else {
 setResults([]);
 setIsOpen(false);
 }
 }, 300);
 return () => clearTimeout(timer);
 }, [query]);

 const handleSubmit = (e) => {
 e.preventDefault();
 if (query.trim()) {
 setIsOpen(false);
 navigate(`/products?search=${encodeURIComponent(query)}`);
 }
 };

 return (
 <div ref={wrapperRef} className="relative flex-1 max-w-2xl ml-4 sm:mx-8">
 <form onSubmit={handleSubmit} className="relative flex items-center w-full bg-slate-100/80 rounded-xl overflow-hidden border border-slate-200/50 focus-within:border-primary-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:shadow-md transition-all duration-300">
 <div className="pl-3 text-slate-400"><Search size={18} /></div>
 <input 
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 onFocus={() => { if (results.length > 0) setIsOpen(true); }}
 placeholder="Search products..."
 className="w-full bg-transparent px-3 py-2.5 outline-none text-sm"
 />
 {query && (
 <button type="button"onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="pr-3 text-slate-400 hover:text-slate-600">
 <X size={16} />
 </button>
 )}
 </form>

 {isOpen && (
 <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
 {loading ? (
 <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
 ) : results.length > 0 ? (
 <div>
 {results.map(product => (
 <Link 
 key={product.id} 
 to={`/product/${product.id}`}
 onClick={() => { setIsOpen(false); setQuery(''); }}
 className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition"
 >
 <div className="w-10 h-10 rounded bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400 text-xs">
 {product.image ? <img src={optimizeImage(product.image, 100)} className="w-full h-full object-cover"alt=""/> : 'IMG'}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-slate-900 truncate">{product.name}</p>
 <p className="text-xs text-slate-500">{product.unit}</p>
 </div>
 <div className="text-sm font-bold text-primary-700 whitespace-nowrap">₹{product.offer_price || product.regular_price}</div>
 </Link>
 ))}
 <button 
 onClick={handleSubmit} 
 className="w-full p-3 text-sm font-bold text-primary-600 bg-primary-50 hover:bg-primary-50 text-center transition"
 >
 View all results for"{query}"
 </button>
 </div>
 ) : query.trim().length > 1 && (
 <div className="p-4 text-center text-sm text-slate-500">No products found.</div>
 )}
 </div>
 )}
 </div>
 );
}

export function NotificationPopup({ isOpen, onClose }) {
 const { notifications, refresh } = useCart();
 const wrapperRef = useRef(null);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
 onClose();
 }
 };
 if (isOpen) {
 document.addEventListener('mousedown', handleClickOutside);
 }
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [isOpen, onClose]);

 const deleteNotification = async (id) => {
 try {
 await api.delete(`/notifications/${id}/`);
 refresh();
 } catch (err) {
 console.error(err);
 }
 };

 if (!isOpen) return null;

 return (
 <div ref={wrapperRef} className="absolute right-0 top-14 w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-slate-900/5 z-50 overflow-hidden flex flex-col max-h-[80vh] transition-all">
 <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
 <h3 className="font-extrabold text-slate-900">Notifications</h3>
 <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={18}/></button>
 </div>
 <div className="overflow-y-auto p-4 space-y-3">
 {(!notifications || notifications.length === 0) ? (
 <div className="text-center py-6">
 <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-300 mx-auto mb-3">
 <Bell size={24} />
 </div>
 <p className="text-sm font-bold text-slate-900">You're all caught up!</p>
 <p className="text-xs text-slate-500 mt-1">No new notifications.</p>
 </div>
 ) : (
 notifications.map(n => (
 <div key={n.id} className={`p-3 rounded-xl border ${n.is_read ? 'border-slate-100 bg-white ' : 'border-indigo-100 bg-indigo-50 '}`}>
 <div className="flex justify-between items-start mb-1">
 <h4 className={`text-sm font-bold ${n.is_read ? 'text-slate-900 ' : 'text-indigo-900 '}`}>{n.title}</h4>
 <div className="flex items-center gap-2">
 <span className="text-[10px] font-medium text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
 <button onClick={() => deleteNotification(n.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
 </div>
 </div>
 <p className={`text-xs ${n.is_read ? 'text-slate-500 ' : 'text-indigo-700 '}`}>{n.message}</p>
 </div>
 ))
 )}
 </div>
 <div className="p-3 border-t border-slate-100 bg-slate-50 text-center">
 <Link to="/notifications"onClick={onClose} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Manage notifications</Link>
 </div>
 </div>
 );
}

function WelcomeScreen() {
 const { user, isCustomer, cart } = useCart();
 const [show, setShow] = useState(() => {
 if (isCustomer && user && !sessionStorage.getItem('hasShownWelcome')) {
 return true;
 }
 return false;
 });
 const [stage, setStage] = useState('initial'); 

 useEffect(() => {
 if (show) {
 sessionStorage.setItem('hasShownWelcome', 'true');
 const timer1 = setTimeout(() => setStage('fade-in'), 100); 
 const timer2 = setTimeout(() => setStage('fade-out'), 2500); 
 const timer3 = setTimeout(() => { setShow(false); setStage('hidden'); }, 3500);
 
 return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
 }
 }, [show]);

 if (!show) return null;

 const hour = new Date().getHours();
 let greeting = "Welcome";
 if (hour >= 5 && hour < 12) {
 greeting = "Good morning";
 } else if (hour >= 12 && hour < 17) {
 greeting = "Good afternoon";
 } else if (hour >= 17 && hour < 22) {
 greeting = "Good evening";
 }

 const name = user?.first_name || user?.username || 'Guest';

 return (
 <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ease-in-out ${stage === 'fade-out' ? 'opacity-0 pointer-events-none' : 'opacity-100'} overflow-hidden`}>
 <div className={`flex flex-col items-center justify-center relative z-10 transition-all duration-700 ease-out transform ${stage === 'fade-in' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
 <div className="text-sm font-bold tracking-[0.2em] uppercase text-slate-400 mb-6 drop-shadow-sm">
 <span className="text-slate-700">Narendra</span> <span className="text-primary-600">Kirana</span>
 </div>
 <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-center">
 {greeting}, {name}.
 </h1>
 </div>
 </div>
 );
}

export function CustomerLayout({ children }) {
  const { cart, isCustomer, favorites, notifications } = useCart()
  const [showNotifications, setShowNotifications] = useState(false)
  const location = useLocation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/store/settings/');
        setSettings(res.data);
      } catch (err) {
        console.error('Failed to load flash announcements', err);
      }
    };
    fetchData();
  }, []);

 
 return (

 <div className="min-h-screen bg-slate-50 pb-20 sm:pb-0 text-slate-900 transition-colors duration-200">
 <WelcomeScreen />

 <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm transition-colors duration-200">
 <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 lg:px-12">
 <Link to="/"className="text-2xl sm:text-3xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm hover:opacity-80 transition-opacity">
 <span className="text-slate-800">Narendra</span>
 <span className="text-primary-600">Kirana</span>
 </Link>
 
 <GlobalSearchBar />

 <div className="flex items-center gap-4 shrink-0">

 {isCustomer ? (
 <>
 <div className="relative">
 <button onClick={() => setShowNotifications(!showNotifications)} className="hidden sm:grid size-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition relative">
 <Bell size={18} />
 {notifications?.some(n => !n.is_read) && (
 <span className="absolute right-0 top-0 size-3 rounded-full bg-indigo-600 border-2 border-slate-900"></span>
 )}
 </button>
 <NotificationPopup isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
 </div>
 <Link to="/profile"className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 hover:border-slate-300 hover:bg-slate-50 transition ml-1 shadow-sm">
 <div className="bg-primary-50 text-primary-700 rounded-full p-1">
 <User size={16} />
 </div>
 <span className="text-sm font-bold text-slate-700 pr-1">My Account</span>
 </Link>
 </>
 ) : (
 <Link to="/login"className="hidden sm:block text-sm font-semibold text-primary-700">Sign in</Link>
 )}
 <Link to="/cart"aria-label="Cart"className="relative hidden sm:flex h-11 w-16 items-center justify-center rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all ml-2 shadow-sm hover:shadow active:scale-95 group">
 <ShoppingCart size={20} strokeWidth={2.5} className="mt-0.5" />
 {cart?.items?.length > 0 && (
 <span className="absolute -top-2 -right-2 flex h-[22px] min-w-[22px] px-1.5 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white shadow-sm ring-2 ring-white">
 {cart.items.length}
 </span>
 )}
 </Link>
 </div>
 </div>
 </header>

 {children}

 <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:hidden transition-colors duration-200 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)]">
 <Link className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold text-primary-700"to="/">
 <Home size={20} />Home
 </Link>
 <Link className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold text-slate-500"to="/categories">
 <LayoutGrid size={20} />Categories
 </Link>
  {isCustomer && (
  <Link className={`relative flex flex-1 flex-col items-center gap-1 text-xs font-semibold transition-colors ${location.pathname === '/profile/orders' ? 'text-primary-700' : 'text-slate-500'}`} to="/profile/orders">
  <Package size={20} />
  Orders
  </Link>
  )}
 <Link className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold text-slate-500"to={isCustomer ?"/profile":"/login"}>
 <User size={20} />{isCustomer ? 'Profile' : 'Sign in'}
 </Link>
 <Link className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${location.pathname === '/cart' ? 'text-primary-700' : 'text-slate-500 hover:text-primary-700'}`} to="/cart">
 <div className="relative">
 <ShoppingCart size={24} strokeWidth={2.5} className={location.pathname === '/cart' ? 'text-primary-700' : 'text-slate-500'} />
 {cart?.items?.length > 0 && <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-slate-900 px-1 text-[10px] font-black text-white border-2 border-white shadow-sm">{cart.items.length}</span>}
 </div>
 <span>Cart</span>
 </Link>
 </nav>
 </div>
 )
}
