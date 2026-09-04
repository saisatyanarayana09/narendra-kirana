import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import api from './services/api';
import { Lock, Eye, EyeOff, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const appSchemeUrl = uid && token ? `smartkirana://reset-password?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}` : '';

  // Mobile-first check: When opened on a mobile device, attempt to launch mobile app first
  useEffect(() => {
    if (!isMobile || !uid || !token) return;

    try {
      if (/Android/i.test(navigator.userAgent)) {
        // Android Intent scheme with seamless web fallback
        window.location.href = `intent://reset-password?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}#Intent;scheme=smartkirana;package=com.narendrakirana.app;S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
      } else {
        // iOS custom scheme
        window.location.href = appSchemeUrl;
      }
    } catch (err) {
      console.log('Mobile app redirection attempt:', err);
    }
  }, [isMobile, uid, token, appSchemeUrl]);

  async function submit(e) {
    e.preventDefault();
    if (!uid || !token) {
      setStatus('error');
      setMessage('Invalid or missing reset link. Please request a new link from the forgot password page.');
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await api.post('/auth/password-reset-confirm/', { 
        uid, 
        token, 
        new_password: password 
      });
      setStatus('success');
      setMessage(res.data.message || 'Password reset successful!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || (err.response ? 'Server Error (' + err.response.status + ')' : err.message) || 'Failed to reset password.');
    }
  }

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-10">
        {/* Mobile App First Banner */}
        {isMobile && uid && token && (
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-lg border border-emerald-500/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl shrink-0 backdrop-blur-sm">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Narendra Kirana App</h3>
                  <p className="text-xs text-emerald-100">Reset password directly in the mobile app</p>
                </div>
              </div>
              <a
                href={appSchemeUrl}
                className="px-3.5 py-2 bg-white text-emerald-800 text-xs font-extrabold rounded-xl shadow hover:bg-emerald-50 active:scale-95 transition-all shrink-0"
              >
                Open App
              </a>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create New Password</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 mb-6">
            Please enter your new password below.
          </p>

          {status === 'success' ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 font-medium text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
              <p className="font-bold text-base">{message}</p>
              <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">Redirecting to login in 3 seconds...</p>
              <Link 
                to="/login" 
                className="mt-4 inline-block px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow"
              >
                Sign In Now
              </Link>
            </div>
          ) : (
            <>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3 rounded-xl text-sm border border-red-100 dark:border-red-900/50">
                  {message}
                </div>
              )}

              {(!uid || !token) && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 p-3.5 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50">
                  Missing reset tokens in URL. Please check that you followed the complete link sent to your email.
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  New Password
                  <div className="relative mt-1">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      placeholder="Enter new password (min. 6 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>

                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Confirm Password
                  <div className="relative mt-1">
                    <input
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={status === 'loading' || !uid || !token}
                className="mt-6 w-full py-3 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-600/20 text-sm"
              >
                {status === 'loading' ? 'Saving...' : 'Save Password'}
              </button>
            </>
          )}
        </form>
      </main>
    </CustomerLayout>
  );
}
