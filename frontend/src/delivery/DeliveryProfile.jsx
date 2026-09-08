import React, { useState, useEffect } from 'react';
import { User, Phone, Bike, ShieldCheck, CheckCircle2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function DeliveryProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/delivery/dashboard/')
      .then(res => setProfile(res.data?.profile))
      .catch(err => console.error("Error loading profile:", err))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="size-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading partner profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-md mx-auto">
      {/* Profile Card */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl text-center relative overflow-hidden">
        <div className="size-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 mx-auto mb-4 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
          <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
            <User size={36} />
          </div>
        </div>

        <h2 className="text-xl font-black text-white">{profile?.name || 'Rider'}</h2>
        <p className="text-xs text-slate-400 mt-0.5">@{profile?.username}</p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mt-3">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Narendra Kirana Delivery Partner</span>
        </div>
      </div>

      {/* Stats and Vehicle Details */}
      <div className="space-y-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lifetime Deliveries</p>
              <p className="text-base font-black text-white">{profile?.total_deliveries || 0} orders</p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Bike size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vehicle Details</p>
              <p className="text-base font-black text-white">
                {profile?.vehicle_type || 'Bike'} {profile?.vehicle_number ? `(${profile.vehicle_number})` : ''}
              </p>
            </div>
          </div>
        </div>

        {profile?.phone && (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Registered Phone</p>
                <p className="text-base font-black text-white">{profile.phone}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
      >
        <LogOut size={16} />
        <span>End Shift & Sign Out</span>
      </button>
    </div>
  );
}
