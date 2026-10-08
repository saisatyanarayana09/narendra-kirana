import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Gift, ShieldCheck, Zap, CheckCircle2, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import GoogleIcon from '../../components/GoogleIcon';

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const { syncUser } = useCart();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const rawRedirect = searchParams.get('redirect') || location.state?.from?.pathname || '/';
  let redirectTarget = '/';
  try {
    const decoded = decodeURIComponent(rawRedirect).trim();
    if (
      decoded.startsWith('/') &&
      !decoded.startsWith('//') &&
      !decoded.startsWith('/login') &&
      !decoded.startsWith('/signup')
    ) {
      redirectTarget = decoded;
    }
  } catch {
    redirectTarget = '/';
  }

  const referralCode = (searchParams.get('ref') || searchParams.get('code') || '').trim().toUpperCase();
  const [referrerName, setReferrerName] = useState('');
  const [isLookingUpReferral, setIsLookingUpReferral] = useState(false);
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Look up referrer name if referral code is present in query parameters
  useEffect(() => {
    if (!referralCode) return;
    setIsLookingUpReferral(true);
    api.get(`/auth/referral-lookup/?code=${encodeURIComponent(referralCode)}`)
      .then((res) => {
        if (res.data?.referrer_name) {
          setReferrerName(res.data.referrer_name);
        }
      })
      .catch(() => {
        // Referral code invalid or lookup failed
      })
      .finally(() => {
        setIsLookingUpReferral(false);
      });
  }, [referralCode]);

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const payload = {
          credential: tokenResponse.access_token,
          token_type: 'access_token',
        };
        if (referralCode) {
          payload.referral_code = referralCode;
        }

        const { data } = await api.post('/auth/google/customer/', payload);
        localStorage.setItem('smart-kirana-customer-token', data.access);
        localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
        localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
        syncUser();

        toast.success(data.is_new ? 'Welcome to Narendra Kirana! 🎉' : 'Signed in with Google! 👋');
        navigate(redirectTarget, { replace: true });
      } catch (err) {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Google Sign-In failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Sign-In was cancelled or failed.');
    }
  });

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to store
        </Link>

        {/* Brand Header */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo-transparent.png" alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Narendra <span className="text-rose-600">Kirana</span>
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Fresh groceries & daily essentials delivered directly to your doorstep.
          </p>
        </div>

        {/* Action Destination Notice */}
        {redirectTarget !== '/' && (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800">
            <Lock size={15} className="shrink-0 text-emerald-600" />
            <span className="font-medium">
              {redirectTarget.includes('checkout')
                ? 'Sign in with Google to complete your checkout.'
                : redirectTarget.includes('orders')
                ? 'Sign in with Google to view and track your orders.'
                : 'Sign in with Google to continue.'}
            </span>
          </div>
        )}

        {/* Personalized Referral Invite Banner */}
        {referralCode && (
          <div className="mt-6 rounded-2xl border-2 border-teal-200 bg-teal-50/80 p-4 shadow-sm flex items-start gap-3.5 animate-in fade-in duration-300">
            <div className="size-10 rounded-xl bg-teal-600/10 flex items-center justify-center text-teal-600 shrink-0 mt-0.5">
              <Gift size={20} />
            </div>
            <div>
              {isLookingUpReferral ? (
                <p className="text-xs font-medium text-teal-700">Validating your invitation code...</p>
              ) : referrerName ? (
                <>
                  <p className="text-sm font-bold text-teal-900">
                    You've been invited by <span className="text-teal-700 font-extrabold">{referrerName}</span>! 🎉
                  </p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    Sign in with Google to claim your exclusive welcome discount on your first order.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-teal-900">
                    Referral Code Applied: <span className="font-mono font-extrabold">{referralCode}</span> 🎁
                  </p>
                  <p className="text-xs text-teal-700 mt-0.5">
                    Sign in with Google to claim your referral reward.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main 1-Tap Google Auth Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">Quick Sign-In</h2>
            <p className="text-xs text-slate-500 mt-1">
              Instant 1-tap sign-in and account setup. No passwords to remember.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* 1-Tap Google Button */}
          <button
            type="button"
            disabled={googleLoading}
            onClick={() => handleGoogleSignIn()}
            className="w-full flex items-center justify-center gap-3.5 px-5 py-4 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50 hover:shadow-md transition-all text-sm font-extrabold text-slate-800 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <GoogleIcon />
            <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>

          {/* Perks */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
              <span>Instant setup with your verified Google account</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck size={15} className="text-emerald-500 shrink-0" />
              <span>100% Safe & Secure — zero passwords or OTP delays</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <Zap size={15} className="text-emerald-500 shrink-0" />
              <span>Automatic wallet activation & rewards on every order</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-[11px] text-slate-400">
          By continuing, you agree to our Terms of Service & Privacy Policy.
        </p>
      </main>
    </CustomerLayout>
  );
}

export default CustomerLoginPage;
