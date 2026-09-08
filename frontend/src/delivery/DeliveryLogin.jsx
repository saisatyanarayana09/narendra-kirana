import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Truck, Lock, User, Eye, EyeOff, AlertCircle, 
  ArrowRight, ShieldCheck, Zap, Sparkles, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';

export default function DeliveryLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFillDemo = () => {
    setUsername('rider1');
    setPassword('Rider@123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/login/', {
        username: username.trim(),
        password: password
      });

      const user = res.data.user;
      const isPartner = Boolean(
        user?.is_delivery_partner || 
        user?.is_owner || 
        user?.is_staff || 
        user?.is_superuser
      );

      if (!isPartner) {
        setError('Access denied: This account is not registered as a Delivery Partner. Please contact store owner.');
        setLoading(false);
        return;
      }

      // Store tokens under delivery prefix
      localStorage.setItem('smart-kirana-delivery-token', res.data.access);
      localStorage.setItem('smart-kirana-delivery-refresh', res.data.refresh);
      localStorage.setItem('smart-kirana-delivery-user', JSON.stringify(user));

      // Also set standard tokens so background services work
      localStorage.setItem('smart-kirana-token', res.data.access);
      localStorage.setItem('smart-kirana-refresh', res.data.refresh);

      navigate('/delivery');
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Dynamic ambient gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-emerald-600/20 via-teal-500/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] bg-emerald-900/15 blur-3xl pointer-events-none" />

      {/* Top Brand Pill */}
      <header className="pt-4 pb-2 z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-bold text-emerald-400 shadow-sm backdrop-blur-md">
          <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Narendra Kirana • Partner Fleet</span>
        </div>
      </header>

      {/* Main Login Card */}
      <div className="w-full max-w-md my-auto z-10">
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/40 relative">
          
          {/* Header Icon & Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="size-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-emerald-400 to-teal-300 p-0.5 shadow-xl shadow-emerald-500/25 mb-4 flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
              <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                <Truck size={30} className="animate-pulse" />
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Rider Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Sign in to receive orders, navigate routes, and verify deliveries
            </p>
          </div>

          {/* Quick Demo Fill Pill */}
          <div className="mb-5 p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-emerald-300 font-bold pl-1">
              <Sparkles size={15} className="text-emerald-400" />
              <span>Testing credentials ready</span>
            </div>
            <button
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black transition active:scale-95 cursor-pointer shadow-xs"
            >
              Fill Demo (rider1)
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Username or Phone Number
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rider1 or 9876543210"
                  required
                  autoComplete="username"
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:bg-slate-950 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your rider password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-emerald-500 focus:bg-slate-950 rounded-2xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:opacity-95 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-3"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Verifying shift...
                </span>
              ) : (
                <>
                  <span>Start Shift & Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
            <Link to="/" className="hover:text-emerald-400 transition-colors">
              ← Storefront
            </Link>
            <Link to="/owner/login" className="hover:text-emerald-400 transition-colors">
              Store Owner Portal →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="py-4 text-center text-xs text-slate-500 z-10">
        Narendra Kirana Supermarket Delivery Fleet Engine v2.0
      </footer>
    </div>
  );
}
