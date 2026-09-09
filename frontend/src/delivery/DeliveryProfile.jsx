import React, { useState, useEffect } from 'react';
import { 
  User, Phone, Bike, ShieldCheck, CheckCircle2, 
  LogOut, Shield, MapPin, Award, Navigation, Calendar 
} from 'lucide-react';
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
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="size-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-slate-400">Loading partner profile...</p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Rider Identity Card */}
      <div className="lg:col-span-4 space-y-4">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl text-center relative overflow-hidden">
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/10 blur-2xl pointer-events-none" />

          <div className="size-24 rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-300 p-1 mx-auto mb-4 shadow-xl shadow-emerald-500/20 flex items-center justify-center">
            <div className="size-full bg-slate-950 rounded-[20px] flex items-center justify-center text-emerald-400 font-black text-3xl">
              {(profile?.name || 'R').charAt(0).toUpperCase()}
            </div>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">{profile?.name || 'Rider'}</h2>
          <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5">@{profile?.username}</p>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black mt-4">
            <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Verified Partner Fleet Member</span>
          </div>
        </div>

        {/* End Shift / Sign Out Button */}
        <button
          onClick={handleLogout}
          className="w-full py-4 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-black text-sm flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-lg shadow-rose-950/20"
        >
          <LogOut size={18} />
          <span>End Shift & Sign Out</span>
        </button>
      </div>

      {/* Right Column: Rider Details Breakdown */}
      <div className="lg:col-span-8 space-y-4">
        <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Award size={28} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Lifetime Deliveries</p>
              <p className="text-xl sm:text-2xl font-black text-white">{profile?.total_deliveries || 0} completed</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            Active Fleet Member
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center gap-4 shadow-xl">
            <div className="size-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Bike size={28} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Vehicle Registered</p>
              <p className="text-base sm:text-lg font-black text-white">
                {profile?.vehicle_type || 'Motorcycle / Bike'}
              </p>
              {profile?.vehicle_number && (
                <p className="text-xs font-mono text-slate-400 mt-0.5">{profile.vehicle_number}</p>
              )}
            </div>
          </div>

          {profile?.phone && (
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex items-center gap-4 shadow-xl">
              <div className="size-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Phone size={28} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Registered Mobile</p>
                <p className="text-base sm:text-lg font-black text-white font-mono">{profile.phone}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/40 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            <strong className="text-slate-200 block font-bold">Assigned Hub</strong>
            <span>Narendra Kirana Store Main Logistics Hub</span>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono text-[11px]">Primary Base</span>
        </div>
      </div>
    </div>
  );
}
