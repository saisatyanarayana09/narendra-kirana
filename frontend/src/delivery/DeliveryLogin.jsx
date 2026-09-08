import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../services/api';

export default function DeliveryLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
      const isPartner = user.is_delivery_partner || user.is_owner || user.is_staff || user.is_superuser;

      if (!isPartner) {
        setError('Access denied: This account is not registered as a Delivery Partner. Please contact store owner.');
        setLoading(false);
        return;
      }

      // Store tokens
      localStorage.setItem('smart-kirana-delivery-token', res.data.access);
      localStorage.setItem('smart-kirana-delivery-refresh', res.data.refresh);
      localStorage.setItem('smart-kirana-delivery-user', JSON.stringify(user));

      // Also set standard tokens so api interceptors work seamlessly
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex flex-col justify-center items-center p-4 sm:p-6 select-none text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15)_0,transparent_60%)] pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/10 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/10 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl z-10">
        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="size-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 mb-4 flex items-center justify-center">
            <div className="size-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
              <Truck size={32} className="animate-pulse" />
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black tracking-wider uppercase mb-1">
            Delivery Partner Fleet
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Narendra <span className="text-emerald-400">Kirana</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Sign in to start receiving delivery orders
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Username or Mobile Number
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                <User size={18} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. 9876543210 or delivery_boy1"
                required
                autoComplete="username"
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:bg-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-emerald-500/20"
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
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="w-full bg-white/5 border border-white/10 focus:border-emerald-500 focus:bg-white/10 rounded-2xl pl-11 pr-11 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:ring-4 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-white p-1 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all duration-200 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <>
                <span>Sign In & Start Shift</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <Link to="/" className="hover:text-emerald-400 transition-colors">
            ← Back to Store
          </Link>
          <Link to="/owner/login" className="hover:text-emerald-400 transition-colors">
            Store Owner Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
