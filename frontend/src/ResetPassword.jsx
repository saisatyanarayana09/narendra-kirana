import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import api from './services/api';
import { Lock, Eye, EyeOff, Smartphone, ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email') || '';
  const initialMode = searchParams.get('mode') === 'otp' || (!uid && !token) ? 'otp' : 'link';

  const [mode, setMode] = useState(initialMode); // 'otp' | 'link'
  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  // Proactive token health state
  const [tokenStatus, setTokenStatus] = useState(uid && token ? 'checking' : 'none'); // 'none' | 'checking' | 'valid' | 'invalid'
  const [tokenError, setTokenError] = useState('');

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const appSchemeUrl = uid && token ? `smartkirana://reset-password?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}` : '';

  useEffect(() => {
    if (uid && token) {
      let isMounted = true;
      setTokenStatus('checking');
      api.post('/auth/password-reset/validate-token/', { uid, token, portal: 'customer' })
        .then((res) => {
          if (!isMounted) return;
          setTokenStatus('valid');
          if (res.data?.email && !email) {
            setEmail(res.data.email);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setTokenStatus('invalid');
          const errData = err.response?.data;
          const errMsg = typeof errData === 'string' ? errData : (errData?.error || 'This reset link has expired or has already been used.');
          setTokenError(String(errMsg));
        });
      return () => { isMounted = false; };
    }
  }, [uid, token]);

  async function submit(e) {
    e.preventDefault();

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
      if (mode === 'otp') {
        if (!email.trim()) {
          setStatus('error');
          setMessage('Please enter your account email address.');
          return;
        }
        if (!otp.trim() || otp.trim().length !== 6) {
          setStatus('error');
          setMessage('Please enter the valid 6-digit OTP sent to your email.');
          return;
        }

        const res = await api.post('/auth/password-reset/otp-confirm/', {
          email: email.trim(),
          otp: otp.trim(),
          new_password: password,
          portal: 'customer'
        });
        setStatus('success');
        setMessage(res.data?.message || 'Password reset successfully!');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        if (!uid || !token) {
          setStatus('error');
          setMessage('Invalid or missing reset link. Please use the 6-Digit OTP tab or request a new link.');
          return;
        }

        const res = await api.post('/auth/password-reset-confirm/', { 
          uid, 
          token, 
          new_password: password,
          portal: 'customer'
        });
        setStatus('success');
        setMessage(res.data?.message || 'Password reset successfully!');
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || errData?.message || '');
      setMessage(String(errMsg || (err.response ? 'Server Error (' + err.response.status + ')' : err.message) || 'Failed to reset password.'));
    }
  }

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-10">
        {/* Mobile App First Banner */}
        {isMobile && uid && token && mode === 'link' && tokenStatus === 'valid' && (
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

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Reset Password</h1>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 mb-5">
            Choose your verification method to reset your password.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode('otp'); setStatus('idle'); setMessage(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'otp'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <KeyRound size={14} /> 6-Digit OTP Code
            </button>
            <button
              type="button"
              onClick={() => { setMode('link'); setStatus('idle'); setMessage(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mode === 'link'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Mail size={14} /> Email Reset Link
            </button>
          </div>

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
            <form onSubmit={submit}>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-3 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/50">
                  {message}
                </div>
              )}

              {mode === 'link' && tokenStatus === 'invalid' && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 p-3.5 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <p className="font-bold">⚠️ Link Expired or Already Used</p>
                  <p>{tokenError || 'This password reset link is invalid or has expired.'}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMode('otp')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs"
                    >
                      Enter 6-Digit OTP Instead
                    </button>
                    <Link
                      to="/forgot-password"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300"
                    >
                      Request New Link
                    </Link>
                  </div>
                </div>
              )}

              {mode === 'link' && (!uid || !token) && (
                <div className="mb-4 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 p-3.5 rounded-xl text-xs border border-amber-200 dark:border-amber-900/50">
                  Missing reset tokens in URL. Switch to the <strong>"6-Digit OTP Code"</strong> tab above or open the complete link sent to your email.
                </div>
              )}

              <div className="space-y-4">
                {mode === 'otp' && (
                  <>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Registered Email
                      <input
                        required
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        placeholder="you@example.com"
                      />
                    </label>

                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                      6-Digit OTP Code
                      <input
                        required
                        type="text"
                        maxLength={6}
                        pattern="[0-9]{6}"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-center tracking-[0.5em] font-mono text-lg font-extrabold"
                        placeholder="123456"
                      />
                      <span className="text-[11px] text-slate-500 block mt-1">
                        Enter the 6-digit code received in your inbox (valid for 15 minutes).
                      </span>
                    </label>
                  </>
                )}

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
                disabled={status === 'loading' || (mode === 'link' && (!uid || !token))}
                className="mt-6 w-full py-3 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-600/20 text-sm"
              >
                {status === 'loading' ? 'Saving Password...' : 'Save & Set New Password'}
              </button>

              <div className="mt-4 text-center">
                <Link to="/forgot-password" className="text-xs text-slate-500 hover:text-indigo-600 font-medium">
                  Need a new OTP or reset link? Request again
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
    </CustomerLayout>
  );
}
