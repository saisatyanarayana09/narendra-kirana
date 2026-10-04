import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  const [resendingActivation, setResendingActivation] = useState(false);
  const [activationResent, setActivationResent] = useState(false);

  // Parse redirect destination from query (?redirect=...) or location state
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

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const { data } = await api.post('/auth/google/customer/', {
          credential: tokenResponse.access_token,
          token_type: 'access_token'
        });
        localStorage.setItem('smart-kirana-customer-token', data.access);
        localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
        localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
        syncUser();
        toast.success(data.is_new ? 'Welcome to Narendra Kirana! 🎉' : 'Signed in with Google! 👋');
        navigate(redirectTarget, { replace: true });
      } catch (err) {
        setError(err.response?.data?.detail || 'Google Sign-In failed. Please try again.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Sign-In was cancelled or failed.');
    }
  });

  async function handleResendActivation() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Please enter your email address first.');
      return;
    }
    setResendingActivation(true);
    try {
      await api.post('/auth/resend-activation/', { email: cleanEmail });
      setActivationResent(true);
      toast.success('Fresh activation link sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || 'Failed to resend activation link.');
    } finally {
      setResendingActivation(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setIsInactive(false);
    setActivationResent(false);
    try {
      const cleanEmail = email.trim();
      const { data } = await api.post('/auth/login/', { username: cleanEmail, password });
      if (!data.user.is_customer) throw new Error('Please use the owner portal for this account.');
      localStorage.setItem('smart-kirana-customer-token', data.access);
      localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
      syncUser();
      toast.success('Signed in successfully!');
      navigate(redirectTarget, { replace: true });
    } catch (requestError) {
      const errData = requestError.response?.data;
      const isInactiveAccount =
        errData?.code === 'account_inactive' ||
        (typeof errData?.detail === 'string' && errData.detail.toLowerCase().includes('not been activated'));

      if (isInactiveAccount) {
        setIsInactive(true);
        setError(typeof errData?.detail === 'string' ? errData : 'Your account has not been activated yet.');
      } else {
        setIsInactive(false);
        setError(errData?.detail || requestError.message || 'Unable to sign in.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const signupLink = location.search ? `/signup${location.search}` : '/signup';

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-slate-900">Customer sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to save your cart, view invoices, and track orders.
          </p>

          {/* Contextual Banner if user was redirected from a protected page */}
          {redirectTarget && redirectTarget !== '/' && (
            <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-sm font-medium text-emerald-800 flex items-center gap-2.5">
              <Lock size={16} className="text-emerald-600 flex-shrink-0" />
              <span>
                {redirectTarget.includes('invoice')
                  ? 'Please sign in to view and download your official invoice.'
                  : redirectTarget.includes('order')
                  ? 'Please sign in to view and track your order.'
                  : redirectTarget.includes('checkout')
                  ? 'Please sign in to complete your checkout.'
                  : redirectTarget.includes('offers')
                  ? 'Please sign in to claim exclusive offers and promo codes.'
                  : 'Please sign in to access your requested page.'}
              </span>
            </div>
          )}

          {error && (
            <div className={`mt-4 rounded-xl p-3.5 text-sm ${isInactive ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-red-50 text-red-700'}`}>
              <p className="font-semibold">{error}</p>
              {isInactive && (
                <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 flex items-center justify-between gap-2">
                  <span className="text-xs text-amber-800">Need a fresh link?</span>
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    disabled={resendingActivation || activationResent}
                    className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50 cursor-pointer"
                  >
                    {activationResent ? '✓ Link Dispatched' : resendingActivation ? 'Sending...' : 'Resend Activation Link'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Continue with Google */}
          <div className="mt-5">
            <button
              type="button"
              disabled={googleLoading || submitting}
              onClick={() => handleGoogleSignIn()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all text-sm font-bold text-slate-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-5">
            <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              or sign in with email
            </span>
            <div className="w-full border-t border-slate-200" />
          </div>

          <label className="mt-1 block text-sm font-bold text-slate-700">
            Email address
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-slate-700">
            Password
            <div className="relative mt-1 w-full">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border p-3 pr-10 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </label>

          <div className="flex justify-end mt-2">
            <Link to="/forgot-password" className="text-sm font-bold text-primary-700 hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            disabled={submitting}
            className="mt-6 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            New customer?{' '}
            <Link to={signupLink} className="font-bold text-primary-700">
              Create account
            </Link>
          </p>
        </form>
      </main>
    </CustomerLayout>
  );
}

export default CustomerLoginPage;
