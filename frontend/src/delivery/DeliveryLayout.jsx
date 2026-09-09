import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, User, LogOut, Navigation, Power, Bell, Shield, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function DeliveryLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [partnerUser, setPartnerUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('smart-kirana-delivery-user') || 'null');
    } catch {
      return null;
    }
  });
  const [isOnline, setIsOnline] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [togglingDuty, setTogglingDuty] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/delivery/dashboard/');
      if (res.data?.profile) {
        setIsOnline(Boolean(res.data.profile.is_online));
      }
      if (res.data?.active_orders) {
        setActiveCount(res.data.active_orders.length);
      }
    } catch (err) {
      console.warn("Could not sync delivery status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDuty = async () => {
    setTogglingDuty(true);
    const nextState = !isOnline;
    try {
      let lat = null;
      let lng = null;
      if (navigator.geolocation && nextState) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {}
      }

      const res = await api.post('/delivery/toggle-duty/', {
        is_online: nextState,
        latitude: lat,
        longitude: lng
      });
      setIsOnline(Boolean(res.data.is_online));
      if (res.data.is_online) {
        toast.success('You are now Online! 🛵 Orders will be routed to you.');
      } else {
        toast('You are now Offline. Have a good rest! ☕', { icon: '🛑' });
      }
    } catch (err) {
      toast.error('Failed to change duty status.');
    } finally {
      setTogglingDuty(false);
    }
  };

  const isDeliveryDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('delivery') ||
    window.location.hostname.startsWith('delivery.')
  );

  const handleLogout = async () => {
    const refresh = localStorage.getItem('smart-kirana-delivery-refresh');
    try {
      if (refresh) {
        await api.post('/auth/logout/', { refresh });
      }
    } catch {}
    localStorage.removeItem('smart-kirana-delivery-token');
    localStorage.removeItem('smart-kirana-delivery-refresh');
    localStorage.removeItem('smart-kirana-delivery-user');
    navigate(isDeliveryDomain ? '/login' : '/delivery/login');
  };

  const navItems = [
    { label: 'Active Trips', path: isDeliveryDomain ? '/' : '/delivery', icon: Truck, badge: activeCount > 0 ? activeCount : null },
    { label: 'Trip History', path: isDeliveryDomain ? '/history' : '/delivery/history', icon: CheckCircle2 },
    { label: 'Profile', path: isDeliveryDomain ? '/profile' : '/delivery/profile', icon: User },
  ];

  const riderName = partnerUser?.first_name 
    ? `${partnerUser.first_name} ${partnerUser.last_name || ''}`.trim() 
    : partnerUser?.username || 'Rider';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Mobile-First & Desktop App Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-2xl border-b border-slate-800/80 px-4 py-3 sm:px-8 lg:px-12 transition-all shadow-lg shadow-black/20">
        <div className="w-full flex items-center justify-between gap-4">
          
          {/* Rider Identity */}
          <Link to={isDeliveryDomain ? '/profile' : '/delivery/profile'} className="flex items-center gap-3 group min-w-0">
            <div className="relative shrink-0">
              <div className="size-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-emerald-400 text-sm">
                  {riderName.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-slate-950 ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-500'
              }`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black text-white tracking-tight truncate group-hover:text-emerald-400 transition-colors">
                  {riderName}
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Fleet Rider
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400 truncate">
                Narendra Kirana Store
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-800/70 p-1.5 rounded-2xl border border-slate-700/60 shadow-inner">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="size-5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center ml-0.5">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Duty Switch & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Interactive Duty Slider Pill */}
            <button
              onClick={handleToggleDuty}
              disabled={togglingDuty}
              className={`relative flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-full text-xs font-black transition-all duration-300 shadow-md active:scale-95 cursor-pointer ${
                isOnline
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 shadow-emerald-950/50 ring-2 ring-emerald-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
              }`}
              title={isOnline ? "You are Online: Tap to go Offline" : "You are Offline: Tap to go Online"}
            >
              <span className="relative flex size-2.5">
                {isOnline && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className={`relative inline-flex rounded-full size-2.5 ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              </span>
              <span className="tracking-wider text-[11px] uppercase">
                {togglingDuty ? 'Updating...' : isOnline ? 'On Duty' : 'Off Duty'}
              </span>
            </button>

            {/* Logout Icon */}
            <button
              onClick={handleLogout}
              className="size-9 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700/80 flex items-center justify-center text-slate-400 transition-all cursor-pointer"
              title="End shift and logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Outlet Container - Full Width */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 pb-28 sm:pb-8">
        <Outlet context={{ isOnline, handleToggleDuty, togglingDuty, fetchStatus, activeCount }} />
      </main>

      {/* Bottom Floating Navigation Bar for Mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-2xl border-t border-slate-800/90 px-3 py-2 flex items-center justify-around pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] shadow-2xl shadow-black">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center justify-center py-1.5 px-4 rounded-2xl transition-all duration-200 cursor-pointer ${
                active 
                  ? 'text-emerald-400 font-black scale-105' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon size={22} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 size-4 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-wide mt-1 font-bold">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
