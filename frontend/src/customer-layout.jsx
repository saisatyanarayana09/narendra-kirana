import { optimizeImage } from './utils/image';
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, Search, ShoppingBasket, ShoppingCart, User, X, Heart, Bell, LayoutGrid, Trash2, ShoppingBag, Leaf, Coffee, Package, Mic, Volume2 } from 'lucide-react'
import { useCart } from './cart-context'
import { useLanguage } from './context/LanguageContext'
import { useTheme } from './context/ThemeContext'
import { useSpeechRecognition, useTextToSpeech } from './hooks/useVoice'
import api from './services/api'

function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const { language } = useLanguage();

  // Text-to-Speech Voice Hook
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Speech-to-Text Voice Hook
  const { 
    isListening, 
    interimTranscript, 
    error: voiceError, 
    setError: setVoiceError, 
    toggleListening 
  } = useSpeechRecognition({
    onResult: (finalText) => {
      setQuery(finalText);
    },
    onFinal: (finalText) => {
      setQuery(finalText);
      setIsOpen(false);
      navigate(`/products?search=${encodeURIComponent(finalText)}`);
    },
    lang: language === 'te' ? 'te-IN' : 'en-IN',
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Display value combines committed query + live interim voice speech
  const displayValue = isListening && interimTranscript 
    ? interimTranscript
    : query;

  useEffect(() => {
    const controller = new AbortController();
    const effectiveQuery = displayValue.trim();

    const timer = setTimeout(() => {
      if (effectiveQuery.length > 1) {
        setLoading(true);
        api.get(`/products/?search=${encodeURIComponent(effectiveQuery)}`, { signal: controller.signal })
          .then(res => {
            setResults(res.data.results?.slice(0, 5) || res.data?.slice(0, 5) || []);
            setIsOpen(true);
          })
          .catch((err) => { if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') console.error(err); })
          .finally(() => setLoading(false));
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [displayValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const targetQuery = displayValue.trim();
    if (targetQuery) {
      setIsOpen(false);
      navigate(`/products?search=${encodeURIComponent(targetQuery)}`);
    }
  };

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      stopSpeaking();
      setTimeout(() => {
        toggleListening();
      }, 150);
    } else {
      toggleListening();
    }
  };

  const handleReadAloud = (e) => {
    e.stopPropagation();
    if (isSpeaking) {
      stopSpeaking();
    } else if (displayValue.trim()) {
      speak(displayValue.trim());
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1 max-w-2xl ml-4 sm:mx-8">
      <form onSubmit={handleSubmit} className={`relative flex items-center w-full bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border transition-all duration-300 ${
        isListening
          ? 'border-rose-500 ring-4 ring-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20'
          : 'border-slate-200/50 dark:border-slate-700/50 focus-within:border-primary-500 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:shadow-md'
      }`}>
        <div className={`pl-3.5 transition-colors ${isListening ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>
          <Search size={18} />
        </div>

        <input 
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (isListening) toggleListening();
          }}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={isListening ? "Listening... Speak now" : "Search products..."}
          className={`w-full bg-transparent pl-3 pr-20 py-2.5 outline-none text-sm text-slate-900 dark:text-white ${
            isListening ? 'placeholder:text-rose-500 placeholder:font-medium' : 'placeholder:text-slate-400'
          }`}
        />

        {/* Right-Hand Button Controls Group positioned cleanly inside Search Bar */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Read Aloud Text-to-Speech Button */}
          {displayValue.trim().length > 0 && !isListening && (
            <button
              type="button"
              onClick={handleReadAloud}
              title={isSpeaking ? "Stop speech" : "Read aloud"}
              className={`p-1.5 rounded-lg transition-all ${
                isSpeaking 
                  ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/60 animate-pulse' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700'
              }`}
            >
              {isSpeaking ? <Volume2 size={15} className="text-primary-600 animate-bounce" /> : <Volume2 size={15} />}
            </button>
          )}

          {/* Clear Input Button */}
          {displayValue.length > 0 && !isListening && (
            <button 
              type="button"
              onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} 
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}

          {/* Speech-to-Text Microphone Button inside Right Edge */}
          <button
            type="button"
            onClick={handleVoiceToggle}
            title={isListening ? "Listening... Click to stop" : "Search by voice"}
            className={`relative p-1.5 rounded-lg transition-all flex items-center justify-center ${
              isListening
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-105'
                : 'text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-200/60 dark:hover:bg-slate-700'
            }`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-lg bg-rose-400 animate-ping opacity-75" />
            )}
            <Mic size={16} className={`relative z-10 ${isListening ? 'text-white animate-pulse' : ''}`} />
          </button>
        </div>
      </form>

      {/* Real-time Voice Status Bar */}
      {isListening && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center justify-between shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="truncate">{interimTranscript ? `"${interimTranscript}"` : "Listening... Speak your item (e.g. 'Sugar', 'Dal', 'Oil')"}</span>
          </div>
          <button 
            type="button" 
            onClick={toggleListening}
            className="text-[11px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded font-bold ml-2 shrink-0"
          >
            Done
          </button>
        </div>
      )}

      {/* Voice Error Notice */}
      {voiceError && (
        <div className="absolute top-full left-0 right-0 mt-1 px-3 py-1.5 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-xs flex items-center justify-between shadow-lg z-50">
          <span className="truncate">{voiceError}</span>
          <button type="button" onClick={() => setVoiceError(null)} className="font-bold ml-2 text-amber-600 hover:text-amber-800">✕</button>
        </div>
      )}

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 overflow-hidden z-50">
          {loading ? (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">Searching...</div>
          ) : results.length > 0 ? (
            <div>
              {results.map(product => (
                <Link 
                  key={product.id} 
                  to={`/product/${product.id}`}
                  onClick={() => { setIsOpen(false); setQuery(''); }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-50 dark:border-slate-800/60 last:border-0 transition"
                >
                  <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400 text-xs">
                    {product.image ? <img src={optimizeImage(product.image, 100)} className="w-full h-full object-cover" alt=""/> : 'IMG'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{product.unit}</p>
                  </div>
                  <div className="text-sm font-bold text-primary-700 dark:text-primary-400 whitespace-nowrap">₹{product.offer_price || product.regular_price}</div>
                </Link>
              ))}
              <button 
                onClick={handleSubmit} 
                className="w-full p-3 text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/60 text-center transition"
              >
                View all results for "{displayValue}"
              </button>
            </div>
          ) : displayValue.trim().length > 1 && (
            <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">No products found.</div>
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
  <div ref={wrapperRef} className="absolute right-0 top-14 w-80 max-w-[calc(100vw-2rem)] bg-white/95 dark:bg-[#0d1322]/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-slate-900/5 dark:ring-slate-800 border border-slate-100 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[80vh] transition-all">
  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
  <h3 className="font-extrabold text-slate-900 dark:text-white">Notifications</h3>
  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"><X size={18}/></button>
  </div>
  <div className="overflow-y-auto p-4 space-y-3">
  {(!notifications || notifications.length === 0) ? (
  <div className="text-center py-6">
  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 rounded-full flex items-center justify-center text-indigo-300 mx-auto mb-3">
  <Bell size={24} />
  </div>
  <p className="text-sm font-bold text-slate-900 dark:text-white">You're all caught up!</p>
  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No new notifications.</p>
  </div>
  ) : (
  notifications.map(n => (
  <div key={n.id} className={`p-3 rounded-xl border ${n.is_read ? 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 ' : 'border-indigo-100 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-950/30 '}`}>
  <div className="flex justify-between items-start mb-1">
  <h4 className={`text-sm font-bold ${n.is_read ? 'text-slate-900 dark:text-slate-100 ' : 'text-indigo-900 dark:text-indigo-300 '}`}>{n.title}</h4>
  <div className="flex items-center gap-2">
  <span className="text-[10px] font-medium text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
  <button onClick={() => deleteNotification(n.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
  </div>
  </div>
  <p className={`text-xs ${n.is_read ? 'text-slate-500 dark:text-slate-400 ' : 'text-indigo-700 dark:text-indigo-300 '}`}>{n.message}</p>
  </div>
  ))
  )}
  </div>
  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
  <Link to="/notifications" onClick={onClose} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">Manage notifications</Link>
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

 const handleSkip = () => {
 setStage('fade-out');
 setTimeout(() => { setShow(false); setStage('hidden'); }, 700);
 };

 return (
  <div onClick={handleSkip} role="button" className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-white via-white to-emerald-50 dark:from-[#090d16] dark:via-[#0c1220] dark:to-[#0f1b2b] transition-opacity duration-700 ease-in-out ${stage === 'fade-out' ? 'opacity-0 pointer-events-none' : 'opacity-100'} overflow-hidden cursor-pointer`}>
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="w-96 h-96 rounded-full border border-emerald-200/10 absolute" />
  <div className="w-72 h-72 rounded-full border border-emerald-300/10 absolute" />
  <div className="w-48 h-48 rounded-full bg-emerald-400/5 absolute" />
  </div>
  <div className="absolute top-[15%] left-[10%] text-2xl opacity-[0.06] animate-bounce" style={{animationDuration: '3s'}}>🥬</div>
  <div className="absolute top-[20%] right-[12%] text-xl opacity-[0.06] animate-bounce" style={{animationDuration: '3.5s'}}>🛒</div>
  <div className="absolute bottom-[20%] left-[15%] text-xl opacity-[0.06] animate-bounce" style={{animationDuration: '4s'}}>🥕</div>
  <div className="absolute bottom-[15%] right-[10%] text-2xl opacity-[0.06] animate-bounce" style={{animationDuration: '2.5s'}}>🌿</div>

  <div className={`flex flex-col items-center justify-center relative z-10 transition-[opacity,transform] duration-700 ease-out transform ${stage === 'fade-in' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
  <div className="flex flex-col items-center justify-center mb-10 relative">
  <div className="absolute w-40 h-40 sm:w-48 sm:h-48 bg-emerald-400/10 rounded-full blur-3xl" />
  <img src="/logo.jpg" className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 object-contain mb-4 drop-shadow-xl relative z-10" alt="Logo" />
  <div className="text-base sm:text-lg font-black tracking-[0.25em] uppercase text-slate-500 drop-shadow-sm text-center ml-2 relative z-10">
  <span className="text-emerald-900 dark:text-emerald-300">Narendra</span> <span className="text-primary-600 dark:text-primary-400">Kirana</span>
  </div>
  </div>
  <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight text-center px-6 leading-tight">
  {greeting},<br className="sm:hidden" /> {name}.
  </h1>
  </div>
  <p className={`absolute bottom-8 text-sm text-slate-300 dark:text-slate-500 transition-opacity duration-700 ${stage === 'fade-in' ? 'opacity-100' : 'opacity-0'}`}>Click anywhere to skip</p>
  </div>
 );
}

import { SmartAppBanner } from './components/SmartAppBanner';

export function CustomerLayout({ children }) {
  const { cart, isCustomer, favorites, notifications } = useCart()
  const { language, changeLanguage, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [showNotifications, setShowNotifications] = useState(false)
  const location = useLocation();

  return (
  <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] pb-20 sm:pb-0 text-slate-900 dark:text-slate-100 transition-colors duration-200">
  <SmartAppBanner />
  <WelcomeScreen />

  <header className="sticky top-0 z-30 border-b border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-[#0d1322]/90 backdrop-blur-xl shadow-sm transition-colors duration-200">
  <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 lg:px-12">
  <Link to="/" className="text-2xl sm:text-3xl font-black tracking-tighter whitespace-nowrap shrink-0 drop-shadow-sm hover:opacity-80 transition-opacity">
  <span className="text-slate-800 dark:text-white">Narendra</span>
  <span className="text-primary-600 dark:text-primary-400">Kirana</span>
  </Link>
  
  <GlobalSearchBar />

  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
  {/* 1-Click Dark/Light Mode Switcher */}
  <button
    type="button"
    onClick={() => toggleTheme()}
    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95 cursor-pointer"
  >
    <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
    <span className="hidden md:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
  </button>

  {/* Language Switcher */}
  <button
    type="button"
    onClick={() => {
      const nextLang = language === 'te' ? 'en' : 'te';
      if (changeLanguage) changeLanguage(nextLang);
      else if (setLanguage) setLanguage(nextLang);
    }}
    title={language === 'te' ? 'Switch to English' : 'తెలుగుకు మారండి'}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-sm active:scale-95 cursor-pointer"
  >
    <span>🌐</span>
    <span>{language === 'te' ? 'తెలుగు' : 'EN'}</span>
  </button>

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
 <span className="absolute -top-2 -right-2 flex h-[22px] min-w-[22px] px-1.5 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-900">
 {cart.items.length}
 </span>
 )}
 </Link>
 </div>
 </div>
 </header>

 {children}

  <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-between border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md px-2 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:hidden transition-colors duration-200 shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.05)]">
  <Link className={`flex flex-1 flex-col items-center gap-1 text-xs font-semibold ${location.pathname === '/' ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`} to="/">
  <Home size={20} />Home
  </Link>
  <Link className={`flex flex-1 flex-col items-center gap-1 text-xs font-semibold ${location.pathname === '/categories' ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`} to="/categories">
  <LayoutGrid size={20} />Categories
  </Link>
   {isCustomer && (
   <Link className={`relative flex flex-1 flex-col items-center gap-1 text-xs font-semibold transition-colors ${location.pathname === '/profile/orders' ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`} to="/profile/orders">
   <Package size={20} />
   Orders
   </Link>
   )}
  <Link className={`flex flex-1 flex-col items-center gap-1 text-xs font-semibold ${location.pathname.startsWith('/profile') ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'}`} to={isCustomer ?"/profile":"/login"}>
  <User size={20} />{isCustomer ? 'Profile' : 'Sign in'}
  </Link>
  <Link className={`relative flex flex-1 flex-col items-center justify-center gap-1 text-xs font-bold transition-all ${location.pathname === '/cart' ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400 hover:text-primary-700'}`} to="/cart">
  <div className="relative">
  <ShoppingCart size={24} strokeWidth={2.5} className={location.pathname === '/cart' ? 'text-primary-700 dark:text-primary-400' : 'text-slate-500 dark:text-slate-400'} />
  {cart?.items?.length > 0 && <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-md bg-slate-900 px-1 text-[10px] font-black text-white border-2 border-white shadow-sm">{cart.items.length}</span>}
  </div>
  <span>Cart</span>
  </Link>
  </nav>
 </div>
 )
}
