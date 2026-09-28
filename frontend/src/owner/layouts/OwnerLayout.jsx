import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Tags, ShoppingCart, Users, Settings, 
  LogOut, PercentCircle, MessageSquare, Layout, Gift, 
  TrendingUp, FileText, SlidersHorizontal,
  Truck, Bell, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const OwnerLayout = () => {
  const [storeStatus, setStoreStatus] = useState({ is_open: false, store_name: 'Store' });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === '/owner') return location.pathname === '/owner';
    return location.pathname.startsWith(path);
  };

  const navigation = [
    { name: 'Dashboard', href: '/owner', icon: LayoutDashboard },
    { name: 'Orders', href: '/owner/orders', icon: ShoppingCart },
    { name: 'Products', href: '/owner/products', icon: Package },
    { name: 'Categories', href: '/owner/categories', icon: Tags },
    { name: 'Customers', href: '/owner/customers', icon: Users },
    { name: 'Offers', href: '/owner/offers', icon: PercentCircle },
    { name: 'Showcase', href: '/owner/showcase', icon: Layout },
    { name: 'Push Broadcast', href: '/owner/push-broadcast', icon: Bell },
    { name: 'Delivery Fleet', href: '/owner/delivery-partners', icon: Truck },
    { name: 'Invoices', href: '/owner/invoices', icon: FileText },
    { name: 'Sales', href: '/owner/sales', icon: TrendingUp },
    { name: 'Referrals', href: '/owner/referrals', icon: Gift },
    { name: 'Feedback', href: '/owner/feedback', icon: MessageSquare },
    { name: 'Settings', href: '/owner/settings', icon: Settings },
    { name: 'Advanced', href: '/owner/advanced-settings', icon: SlidersHorizontal },
  ];

  useEffect(() => {
    api.get('/store/settings/')
      .then(res => setStoreStatus(res.data))
      .catch(err => console.error('Failed to load store settings', err));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      toast.success('Logged out securely');
      navigate('/login');
    } catch (err) {
      toast.error('Logout failed');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#8ea0b3] dark:bg-slate-950 p-2 sm:p-6 md:p-8 flex items-center justify-center font-sans selection:bg-amber-400/30">
      
      {/* The main glass app container */}
      <div className="w-full h-[calc(100vh-16px)] sm:h-[calc(100vh-48px)] md:h-[calc(100vh-64px)] 
        bg-[#fbf9f4] dark:bg-[#1e2333] 
        rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] 
        flex flex-col overflow-hidden relative ring-1 ring-white/60 dark:ring-white/5">
        
        {/* Ambient Glow Effects (Glassmorphism gradient like the image) */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#ffefc9] to-transparent dark:from-amber-600/10 rounded-full blur-[100px] -z-10 pointer-events-none -translate-y-1/3 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#fbf2da] to-transparent dark:from-orange-900/10 rounded-full blur-[100px] -z-10 pointer-events-none translate-y-1/3 -translate-x-1/4" />

        {/* Top Header/Navigation Pill Area */}
        <header className="px-4 py-4 sm:px-8 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-20">
          
          {/* Logo / Store Name */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[14px] bg-zinc-900 dark:bg-amber-400 flex items-center justify-center shadow-lg shadow-zinc-900/10 rotate-3">
                <Sparkles className="w-6 h-6 text-[#fbf9f4] dark:text-zinc-900" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
                  Crextio<span className="text-amber-500">.</span>
                </h1>
                <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase mt-0.5">{storeStatus.store_name}</span>
              </div>
            </div>
            
            {/* Mobile-only logout */}
            <button onClick={handleLogout} className="sm:hidden p-2 text-zinc-500 bg-black/5 rounded-full">
              <LogOut size={18} />
            </button>
          </div>

          {/* Desktop Nav Pill Bar */}
          <nav className="w-full sm:w-auto flex items-center gap-1.5 overflow-x-auto hide-scrollbar bg-white/60 dark:bg-black/40 p-1.5 rounded-full shadow-sm ring-1 ring-black/5 backdrop-blur-md">
            {navigation.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all duration-300 ${
                    active
                      ? 'bg-zinc-900 text-white shadow-md dark:bg-amber-400 dark:text-zinc-900'
                      : 'text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  {/* Removed icon to strictly match the image which only has text for tabs */}
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Area (Settings, Notification, User) */}
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/owner/settings" className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold text-zinc-600 bg-white/60 hover:bg-white transition-all ring-1 ring-black/5 shadow-sm">
              <Settings size={14} />
              <span>Setting</span>
            </Link>
            <button className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/40 flex items-center justify-center text-zinc-600 hover:bg-white hover:shadow transition-all ring-1 ring-black/5">
              <Bell size={16} />
            </button>
            <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-white/60 dark:bg-black/40 flex items-center justify-center text-zinc-600 hover:bg-rose-50 hover:text-rose-600 hover:shadow transition-all ring-1 ring-black/5">
              <Users size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pt-2 sm:pt-4 bg-transparent relative z-10 scroll-smooth">
          <Outlet />
        </main>

      </div>
    </div>
  );
};

export default OwnerLayout;
