import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, Clock, User, LogOut, Navigation, Power } from 'lucide-react';
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
  const [togglingDuty, setTogglingDuty] = useState(false);

  useEffect(() => {
    // Initial fetch of dashboard to sync online status
    api.get('/delivery/dashboard/')
      .then(res => {
        if (res.data?.profile) {
          setIsOnline(Boolean(res.data.profile.is_online));
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleDuty = async () => {
    setTogglingDuty(true);
    try {
      // Try to get geolocation if available
      let lat = null;
      let lng = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {}
      }

      const res = await api.post('/delivery/toggle-duty/', {
        is_online: !isOnline,
        latitude: lat,
        longitude: lng
      });
      setIsOnline(Boolean(res.data.is_online));
    } catch (err) {
      console.error("Failed to toggle duty:", err);
    } finally {
      setTogglingDuty(false);
    }
  };

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
    navigate('/delivery/login');
  };

  const navItems = [
    { label: 'Active Tasks', path: '/delivery', icon: Truck },
    { label: 'Trip History', path: '/delivery/history', icon: CheckCircle2 },
    { label: 'My Profile', path: '/delivery/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased select-none pb-20 sm:pb-0">
      {/* Sticky Delivery Top Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Brand */}
          <Link to="/delivery" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-md shadow-emerald-500/20">
              <Truck size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight flex items-center gap-1.5 text-white">
                <span>Narendra</span>
                <span className="text-emerald-400">Kirana</span>
                <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Rider
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {partnerUser?.first_name || partnerUser?.username || 'Delivery Partner'}
              </p>
            </div>
          </Link>

          {/* Right Header Actions: Duty Button & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleToggleDuty}
              disabled={togglingDuty}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                isOnline
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750'
              }`}
              title={isOnline ? "You are Online" : "You are Offline"}
            >
              <span className={`size-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
              <span>{isOnline ? 'ON DUTY' : 'OFF DUTY'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="size-9 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 border border-slate-700 flex items-center justify-center text-slate-400 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Screen Outlet */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        <Outlet context={{ isOnline, handleToggleDuty, togglingDuty }} />
      </main>

      {/* Bottom Navigation for Mobile Browsers */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 py-1.5 px-3 flex items-center justify-around pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                active ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
