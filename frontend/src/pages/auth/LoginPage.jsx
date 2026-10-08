import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CheckCircle2, Lock, Phone, X } from 'lucide-react';
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

  const [referralCode, setReferralCode] = useState(
    (searchParams.get('ref') || searchParams.get('code') || searchParams.get('referral_code') || '').trim().toUpperCase()
  );
  const [referrerName, setReferrerName] = useState('');
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Modal for mandatory mobile number on signup
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [pendingCredential, setPendingCredential] = useState(null);
  const [submittingPhone, setSubmittingPhone] = useState(false);

  // Look up referrer name if referral code exists, or try IP attribution
  useEffect(() => {
    if (referralCode) {
      fetchReferralLookup(referralCode);
    } else {
      // Try IP attribution
      api.get('/auth/referral-lookup/?ip=true')
        .then((res) => {
          if (res.data?.referral_code) {
            setReferralCode(res.data.referral_code);
            setReferrerName(res.data.referrer_name || '');
          }
        })
        .catch(() => {});
    }
  }, [referralCode]);

  const fetchReferralLookup = (code) => {
    if (!code) return;
    api.get(`/auth/referral-lookup/?code=${encodeURIComponent(code)}`)
      .then((res) => {
        if (res.data?.referrer_name) {
          setReferrerName(res.data.referrer_name);
        }
      })
      .catch(() => {});
  };

  const handleApplyManualCode = (e) => {
    e.preventDefault();
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    setReferralCode(clean);
    fetchReferralLookup(clean);
    setShowReferralInput(false);
  };

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

        const res = await api.post('/auth/google/customer/', payload);
        const data = res.data;

        // If backend asks for mandatory phone number before account creation
        if (data.requires_mobile) {
          setPendingCredential(tokenResponse.access_token);
          if (data.referral_code && !referralCode) {
            setReferralCode(data.referral_code);
            fetchReferralLookup(data.referral_code);
          }
          setShowMobileModal(true);
          return;
        }

        completeLogin(data);
      } catch (err) {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Sign in failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Sign-In was cancelled.');
    }
  });

  const handleMobileSubmit = async (e) => {
    e.preventDefault();
    const clean = mobileNumber.replace(/\D/g, '');
    let digits = clean;
    if (digits.length === 12 && digits.startsWith('91')) {
      digits = digits.slice(2);
    }
    if (digits.length !== 10 || !['6', '7', '8', '9'].includes(digits[0])) {
      setMobileError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    setMobileError('');
    setSubmittingPhone(true);

    try {
      const payload = {
        credential: pendingCredential,
        token_type: 'access_token',
        mobile_number: digits,
      };
      if (referralCode) {
        payload.referral_code = referralCode;
      }

      const res = await api.post('/auth/google/customer/', payload);
      setShowMobileModal(false);
      completeLogin(res.data);
    } catch (err) {
      setMobileError(err.response?.data?.detail || err.response?.data?.error || 'Failed to verify phone number.');
    } finally {
      setSubmittingPhone(false);
    }
  };

  const completeLogin = (data) => {
    localStorage.setItem('smart-kirana-customer-token', data.access);
    localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
    localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
    syncUser();
    toast.success('Signed in successfully');
    navigate(redirectTarget, { replace: true });
  };

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to store
        </Link>

        {/* Brand Header */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo-transparent.png" alt="Logo" className="w-10 h-10 object-contain" />
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Narendra <span className="text-rose-600">Kirana</span>
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Fresh groceries and daily essentials delivered to your door.
          </p>
        </div>

        {/* Action Notice */}
        {redirectTarget !== '/' && (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
            <Lock size={14} className="shrink-0 text-emerald-600" />
            <span className="font-medium">
              {redirectTarget.includes('checkout')
                ? 'Sign in to complete your checkout.'
                : redirectTarget.includes('orders')
                ? 'Sign in to view your order history.'
                : 'Sign in to continue.'}
            </span>
          </div>
        )}

        {/* Referral Invite Banner */}
        {referralCode && (
          <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50/80 p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div>
              <p className="text-xs font-bold text-teal-900">
                {referrerName ? `Invited by ${referrerName}` : `Referral code ${referralCode}`}
              </p>
              <p className="text-[11px] text-teal-700 mt-0.5">
                ₹50 referral credit will be added to your account.
              </p>
            </div>
            <button
              onClick={() => { setReferralCode(''); setReferrerName(''); }}
              className="text-teal-600 hover:text-teal-800 p-1"
              title="Remove code"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* 1-Tap Google Auth Card */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Sign in</h2>
            <p className="text-xs text-slate-500 mt-1">
              One-tap sign-in with your Google account.
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
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl hover:bg-slate-50 transition-all text-sm font-bold text-slate-800 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <GoogleIcon />
            <span>{googleLoading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>

          {/* Manual Referral Link */}
          {!referralCode && (
            <div className="mt-4 text-center">
              {!showReferralInput ? (
                <button
                  type="button"
                  onClick={() => setShowReferralInput(true)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Have a referral code?
                </button>
              ) : (
                <form onSubmit={handleApplyManualCode} className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter referral code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs uppercase font-mono tracking-wider focus:outline-emerald-500"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReferralInput(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Clean Security Badges */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Instant account setup</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
              <span>Verified Google security</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-[11px] text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>

        {/* Mandatory Mobile Number Modal */}
        {showMobileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Phone size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Mobile number</h3>
                    <p className="text-[11px] text-slate-500">Required for delivery updates</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMobileModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              {referralCode && (
                <div className="mb-4 rounded-lg bg-teal-50 border border-teal-100 p-2 text-xs text-teal-800">
                  Invited by {referrerName || referralCode} • ₹50 credit applied
                </div>
              )}

              {mobileError && (
                <div className="mb-3 rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs font-semibold text-rose-700">
                  {mobileError}
                </div>
              )}

              <form onSubmit={handleMobileSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone number
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 px-3 py-2.5 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600">
                    <span className="text-xs font-bold text-slate-500 mr-2">+91</span>
                    <input
                      type="tel"
                      autoFocus
                      maxLength={10}
                      placeholder="98765 43210"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMobileModal(false)}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPhone || mobileNumber.length !== 10}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {submittingPhone ? 'Saving...' : 'Continue'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </CustomerLayout>
  );
}

export default CustomerLoginPage;
