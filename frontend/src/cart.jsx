import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBasket, ArrowLeft, Eye, EyeOff, CheckCircle2, Package, PackageSearch, Truck, Store, XCircle, MapPin, Edit2, RefreshCw, Gift, Lock, Sparkles, Check, AlertCircle, ShieldCheck, MailCheck, Copy, AlertTriangle, Clock, Calendar, QrCode } from 'lucide-react'
import toast from 'react-hot-toast'
import api from './services/api'
import { CustomerLayout } from './customer-layout'
import { useCart } from './cart-context'
import { QRCodeSVG } from 'qrcode.react'

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
        setError(typeof errData?.detail === 'string' ? errData.detail : 'Your account has not been activated yet.');
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
          className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline"
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
                    className="text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {activationResent ? '✓ Link Dispatched' : resendingActivation ? 'Sending...' : 'Resend Activation Link'}
                  </button>
                </div>
              )}
            </div>
          )}

          <label className="mt-5 block text-sm font-bold text-slate-700">
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
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
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
            className="mt-6 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50"
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

function generateFriendlyPassword() {
  const words = ['Kirana', 'Mango', 'Fresh', 'Spice', 'Green', 'Daily', 'Rice', 'Sweet', 'Harvest', 'Super'];
  const symbols = ['@', '#', '$', '!', '&'];
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  const randomNumber = Math.floor(1000 + Math.random() * 9000);
  return `${randomWord}${randomSymbol}${randomNumber}`;
}

export function CustomerSignupPage() {
  const navigate = useNavigate(); 
  const location = useLocation();
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { first_name: '', email: '', mobile_number: '', password: '', confirm_password: '', referral_code: params.get('ref') || '' };
  });
  const [error, setError] = useState(''); 
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedNotice, setGeneratedNotice] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [referrerName, setReferrerName] = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Parse redirect destination if user was deep-linked (e.g. from an email invoice link)
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect') || '';

  // Inline referral feedback
  const [inlineReferrer, setInlineReferrer] = useState(null);
  const [inlineChecking, setInlineChecking] = useState(false);

  // Live password validation criteria
  const pwd = form.password || '';
  const confirmPwd = form.confirm_password || '';

  const hasMinLength = pwd.length >= 8;
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const isNotOnlyNumbers = pwd.length > 0 && !/^\d+$/.test(pwd);
  const hasMix = hasLetters && hasNumbers;

  // Calculate score (0 to 4)
  let strengthScore = 0;
  if (pwd.length > 0) {
    if (pwd.length < 8 || !isNotOnlyNumbers) strengthScore = 1;
    else if (hasMinLength && (hasLetters || hasNumbers) && !hasMix) strengthScore = 2;
    else if (hasMinLength && hasMix && pwd.length < 10) strengthScore = 3;
    else if (pwd.length >= 10 && hasMix && /[^a-zA-Z0-9]/.test(pwd)) strengthScore = 4;
    else strengthScore = 3;
  }

  const strengthLabels = ['Enter password', 'Weak', 'Fair', 'Good & Secure', 'Very Strong'];
  const strengthColors = ['bg-slate-200', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500'];
  const strengthTextColors = ['text-slate-400', 'text-rose-600', 'text-amber-600', 'text-emerald-600', 'text-teal-600'];

  const doPasswordsMatch = pwd.length > 0 && confirmPwd.length > 0 && pwd === confirmPwd;
  const isConfirmDirty = confirmPwd.length > 0;

  // ONE-TIME effect on mount to handle URL referral codes (Popup)
  useEffect(() => {
    const urlRefCode = searchParams.get('ref')?.trim().toUpperCase();
    if (urlRefCode && urlRefCode.length >= 5) {
      api.get('/auth/referral-lookup/?code=' + urlRefCode)
        .then(res => {
          setReferrerName(res.data.referrer_name);
          setShowWelcomeModal(true);
        })
        .catch(() => {
          setReferrerName('');
        });
    }
  }, [location.search]);

  // Effect for inline validation as user types referral code
  useEffect(() => {
    const code = form.referral_code?.trim().toUpperCase();
    if (!code || code.length < 5) {
      setInlineReferrer(null);
      setInlineChecking(false);
      return;
    }
    
    setInlineChecking(true);
    const timer = setTimeout(() => {
      api.get('/auth/referral-lookup/?code=' + code)
        .then(res => {
          setInlineReferrer({ name: res.data.referrer_name, isValid: true });
        })
        .catch(() => {
          setInlineReferrer({ error: 'Invalid referral code', isValid: false });
        })
        .finally(() => {
          setInlineChecking(false);
        });
    }, 600);
    
    return () => clearTimeout(timer);
  }, [form.referral_code]);

  function handleAcceptReferral() {
    setShowWelcomeModal(false);
  }

  function handleRejectReferral() {
    setForm({ ...form, referral_code: '' });
    setReferrerName('');
    setShowWelcomeModal(false);
  }

  // 1-Tap Password Generator: eliminates confusion for customers
  function handleSuggestPassword() {
    const suggested = generateFriendlyPassword();
    setForm(prev => ({
      ...prev,
      password: suggested,
      confirm_password: suggested
    }));
    setShowPassword(true);
    setShowConfirmPassword(true);
    setGeneratedNotice(true);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(suggested).catch(() => {});
    }
    toast.success('Generated secure password and filled both fields!', { icon: '✨' });
  }

  async function submit(event) {
    event.preventDefault();

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!isNotOnlyNumbers) {
      setError('Password cannot be entirely numbers. Please include letters.');
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    const payload = { ...form, username: form.email };
    
    try {
      await api.post('/auth/signup/', payload);
      setShowSuccessModal(true);
    } catch (requestError) {
      const details = requestError.response?.data;
      if (details?.password) {
        setError(Array.isArray(details.password) ? details.password.join(' ') : details.password);
      } else {
        setError(details ? Object.values(details).flat().join(' ') : 'Unable to create account. Please check your information.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const loginLink = redirectTarget ? `/login?redirect=${encodeURIComponent(redirectTarget)}` : '/login';

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-8">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <form onSubmit={submit} className="rounded-2xl bg-white p-6 sm:p-7 shadow-sm border border-slate-100">
          <h1 className="text-2xl font-extrabold text-slate-900">Create Account</h1>
          <p className="mt-1 text-sm text-slate-600">
            Join Narendra Kirana for fresh daily essentials & exclusive offers.
          </p>
          
          {error && (
            <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="mt-5 space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                Full Name *
              </label>
              <input
                required
                placeholder="e.g. Rahul Sharma"
                value={form.first_name}
                onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                Email Address *
              </label>
              <input
                required
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                Mobile Number *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 font-bold text-sm">+91</span>
                <input
                  required
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit mobile number"
                  value={form.mobile_number}
                  onChange={(event) => setForm({ ...form, mobile_number: event.target.value.replace(/\D/g, '') })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 pl-12 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
                />
              </div>
            </div>
            
            {/* Password Section with Interactive Assistance */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Password *
                </label>
                {/* 1-Tap Password Suggestion */}
                <button
                  type="button"
                  onClick={handleSuggestPassword}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors border border-emerald-200/60 shadow-2xs"
                  title="Click to automatically create a strong, easy-to-remember password"
                >
                  <Sparkles size={13} className="text-emerald-600" />
                  Suggest Password
                </button>
              </div>

              <div className="relative w-full">
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password (min. 8 characters)"
                  value={form.password}
                  onChange={(event) => {
                    setForm({ ...form, password: event.target.value });
                    setGeneratedNotice(false);
                  }}
                  className={`w-full rounded-xl border p-3 pr-10 text-sm outline-none transition-all ${
                    hasMinLength && hasMix && isNotOnlyNumbers
                      ? 'border-emerald-300 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Generated Notice */}
              {generatedNotice && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                  <span>
                    🔑 Password set to: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-200">{form.password}</strong>
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600">Copied!</span>
                </div>
              )}

              {/* Password Strength Visual Meter */}
              {pwd.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-medium">Strength:</span>
                    <span className={`font-bold ${strengthTextColors[strengthScore]}`}>
                      {strengthLabels[strengthScore]}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          step <= strengthScore ? strengthColors[strengthScore] : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Real-Time Rule Checklist */}
              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    hasMinLength ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      hasMinLength ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>8+ characters</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    hasMix ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      hasMix ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>Letters & numbers</span>
                </div>

                <div
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                    isNotOnlyNumbers ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isNotOnlyNumbers ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    <Check size={11} strokeWidth={3} />
                  </div>
                  <span>Not all-numeric</span>
                </div>
              </div>
            </div>
            
            {/* Confirm Password */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                Confirm Password *
              </label>
              <div className="relative w-full">
                <input
                  required
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={form.confirm_password}
                  onChange={(event) => setForm({ ...form, confirm_password: event.target.value })}
                  className={`w-full rounded-xl border p-3 pr-10 text-sm outline-none transition-all ${
                    isConfirmDirty
                      ? doPasswordsMatch
                        ? 'border-emerald-400 bg-emerald-50/20 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
                        : 'border-amber-300 bg-amber-50/20 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Live Match Feedback */}
              {isConfirmDirty && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold">
                  {doPasswordsMatch ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check size={13} strokeWidth={3} /> Passwords match!
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertCircle size={13} /> Passwords do not match yet
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Referral Code */}
            <div>
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1.5">
                Referral Code (Optional)
              </label>
              <input
                name="referral_code"
                value={form.referral_code}
                onChange={(event) => setForm({ ...form, referral_code: event.target.value.toUpperCase() })}
                placeholder="e.g. REF-A1B2C"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all uppercase font-mono"
              />
              {inlineChecking && (
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Verifying code...
                </p>
              )}
              {!inlineChecking && inlineReferrer?.isValid && (
                <p className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={13} /> Valid referral! Invited by {inlineReferrer.name}.
                </p>
              )}
              {!inlineChecking && inlineReferrer?.isValid === false && (
                <p className="mt-2 text-xs text-red-500 font-medium flex items-center gap-1">
                  <XCircle size={13} /> {inlineReferrer.error}
                </p>
              )}
            </div>
          </div>
          
          <button
            disabled={
              submitting ||
              (inlineReferrer && !inlineReferrer.isValid) ||
              (form.password.length > 0 && form.confirm_password.length > 0 && !doPasswordsMatch)
            }
            className="mt-6 min-h-12 w-full rounded-xl bg-primary-600 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary-500/20"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to={loginLink} className="font-bold text-primary-700 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
        
        {/* Welcome Referral Popup */}
        {showWelcomeModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center transform transition-all scale-100">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-5 text-emerald-600 shadow-inner">
                <Gift size={32} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Referral Found!</h3>
              <p className="text-slate-600 mb-8 text-base leading-relaxed">
                <b>{referrerName}</b> has invited you. Accept this referral to claim your welcome rewards when you sign up!
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleAcceptReferral}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                  ✅ Accept Referral
                </button>
                <button
                  type="button"
                  onClick={handleRejectReferral}
                  className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all hover:text-slate-900"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Created / Email Activation Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center">
              <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-5 text-emerald-600 shadow-sm">
                <MailCheck size={36} strokeWidth={2.2} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Account Created! 🎉</h3>
              <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                We have sent an activation link to <strong className="text-slate-900 font-semibold">{form.email}</strong>.
                Please check your inbox (and spam folder) and click the link to activate your account.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 mb-6 text-left space-y-1">
                <p className="font-bold text-slate-800">Next Steps:</p>
                <p>1. Open your email client</p>
                <p>2. Click &quot;Activate Account&quot;</p>
                <p>3. Return here to log in and start shopping!</p>
              </div>
              <button
                type="button"
                onClick={() => navigate(loginLink)}
                className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-base hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
              >
                Proceed to Sign In
              </button>
            </div>
          </div>
        )}
      </main>
    </CustomerLayout>
  );
}

export function checkOperatingHours(settings) {
  if (!settings || !settings.auto_cutoff_orders) {
    return { isClosed: false };
  }
  if (!settings.store_timings_json) {
    return { isClosed: false };
  }

  try {
    let timings = settings.store_timings_json;
    if (typeof timings === 'string') {
      timings = JSON.parse(timings);
    }

    const now = new Date();
    const dayIndex = now.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayName = dayNames[dayIndex];

    let daySchedule = null;
    if (Array.isArray(timings)) {
      daySchedule = timings.find(t => 
        (t.day && String(t.day).toLowerCase() === currentDayName) || 
        t.day_index === dayIndex ||
        t.day === dayIndex
      );
    } else if (typeof timings === 'object' && timings !== null) {
      daySchedule = timings[currentDayName] || 
                    timings[currentDayName.slice(0, 3)] || 
                    timings[currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1)] ||
                    timings[dayIndex] || 
                    timings[String(dayIndex)];
    }

    if (!daySchedule) {
      return { isClosed: false };
    }

    if (daySchedule.is_closed || daySchedule.closed) {
      const capitalizedDay = currentDayName.charAt(0).toUpperCase() + currentDayName.slice(1);
      return {
        isClosed: true,
        message: `The store is scheduled closed today (${capitalizedDay}). Online checkout is currently disabled.`
      };
    }

    const openTimeStr = daySchedule.open || daySchedule.open_time || daySchedule.start;
    const closeTimeStr = daySchedule.close || daySchedule.close_time || daySchedule.end;

    if (!openTimeStr || !closeTimeStr) {
      return { isClosed: false };
    }

    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    if (currentMinutes < openMinutes || currentMinutes >= closeMinutes) {
      return {
        isClosed: true,
        message: `The store is currently outside operating hours (${openTimeStr} - ${closeTimeStr}). Online orders will resume during regular hours.`
      };
    }
  } catch (err) {
    console.error('Error checking store operating hours:', err);
  }

  return { isClosed: false };
}

export function parseTimeSlots(slotsData) {
  if (!slotsData) return [];
  let list = slotsData;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list) && typeof list === 'object' && list !== null) {
    list = Object.values(list);
  }
  if (!Array.isArray(list)) return [];

  return list.map((item, idx) => {
    if (typeof item === 'string') {
      return { id: idx, label: item, raw: item };
    }
    const label = item.label || item.name || `${item.start_time || item.start || ''} - ${item.end_time || item.end || ''}`.trim() || `Slot ${idx + 1}`;
    return {
      id: item.id || idx,
      label,
      startTime: item.start_time || item.start || item.from,
      endTime: item.end_time || item.end || item.to,
      raw: item
    };
  }).filter(s => s.label);
}

export function isSlotPassedToday(slot, bufferMinutes = 0) {
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const cutoffMinutes = currentTotalMinutes + Number(bufferMinutes || 0);

  let startMinutes = null;
  if (slot.startTime) {
    const parts = String(slot.startTime).match(/(\d{1,2}):(\d{2})/);
    if (parts) {
      startMinutes = parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    }
  }
  if (startMinutes === null && slot.label) {
    const match = slot.label.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2] ? parseInt(match[2], 10) : 0;
      const meridiem = match[3]?.toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      startMinutes = h * 60 + m;
    }
  }

  if (startMinutes !== null) {
    return startMinutes <= cutoffMinutes;
  }
  return false;
}

export function getLocalDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function CartPage() {
  const navigate = useNavigate();
  const { cart, isCustomer, storeSettings, update, applyPromo, clearCart } = useCart();
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const items = cart?.items || [];

  if (!isCustomer) return <CustomerLayout><main className="mx-auto max-w-xl p-6 text-center"><h1 className="text-2xl font-extrabold">Your cart</h1><p className="mt-3 text-slate-600">Sign in to add products and place a pickup order.</p><Link to="/login" className="mt-5 inline-block rounded-xl bg-primary-600 px-5 py-3 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98]">Sign in</Link></main></CustomerLayout>;

  async function change(item, quantity) {
    try {
      await update(item, quantity);
    } catch {
      setError('Could not update your cart.');
    }
  }

  async function handleApplyPromo(e) {
    e.preventDefault();
    setPromoError('');
    try {
      await applyPromo(promoInput);
      setPromoInput('');
    } catch(err) {
      setPromoError(err.response?.data?.detail || 'Invalid promo code');
    }
  }

  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMsg = storeSettings?.emergency_pause_message || 'Online order placement is temporarily paused by the store due to high volume. We apologize for the inconvenience.';
  const operatingHours = checkOperatingHours(storeSettings);
  const isClosedHours = operatingHours.isClosed;

  const outOfStockItems = items.filter(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
  const hasOutOfStock = outOfStockItems.length > 0;

  const discount = parseFloat(cart?.discount || 0);
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const itemsTotal = parseFloat(cart?.items_total || (mrpTotal - discount)) || mrpTotal;
  const packagingFee = parseFloat(cart?.packaging_fee || 0);
  const promoDiscount = parseFloat(cart?.promo_discount || 0);
  const totalPayable = parseFloat(cart?.total || (itemsTotal - promoDiscount + packagingFee));
  const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || 0);
  const freeDeliveryGap = Math.max(0, freeThreshold - itemsTotal);
  const isFreeDeliveryUnlocked = freeThreshold > 0 && itemsTotal >= freeThreshold;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || 0);
  const isBelowMinOrder = minOrderAmount > 0 && itemsTotal < minOrderAmount;

  return (
    <CustomerLayout>
      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-36 lg:pb-16">
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer p-0">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Your Cart</h1>
        </div>
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs sm:text-sm font-bold text-red-700">{error}</p>}

        {/* Out of Stock Warning Banner */}
        {hasOutOfStock && (
          <div className="mb-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800/60 p-4 text-red-900 dark:text-red-200 flex items-start gap-3 shadow-xs">
            <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-black text-red-800 dark:text-red-300 uppercase tracking-wider text-xs mb-1">
                Action Required: Out of Stock
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {outOfStockItems.length === 1
                  ? '1 item in your cart is currently out of stock. Please remove it to proceed to checkout.'
                  : `${outOfStockItems.length} items in your cart are currently out of stock. Please remove them to proceed to checkout.`}
              </p>
            </div>
          </div>
        )}

        {/* Store Emergency Pause Banner */}
        {isEmergencyPaused && (
          <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 p-4 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider text-xs mb-1">
                Store Emergency Pause Active
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {emergencyPauseMsg}
              </p>
            </div>
          </div>
        )}

        {/* Operating Hours Notice */}
        {isClosedHours && (
          <div className="mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/60 p-4 text-rose-900 dark:text-rose-200 flex items-start gap-3 shadow-xs">
            <Clock className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h2 className="font-black text-rose-800 dark:text-rose-300 uppercase tracking-wider text-xs mb-1">
                Store Outside Operating Hours
              </h2>
              <p className="text-xs font-semibold leading-relaxed">
                {operatingHours.message}
              </p>
            </div>
          </div>
        )}

        {!items.length ? (
          <div className="mt-4 rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-xs border border-slate-200/80 dark:border-slate-800 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5 shadow-inner">
              <ShoppingBasket size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Your cart is empty</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto leading-relaxed">
              Looks like you haven't added anything to your cart yet. Browse fresh groceries and daily essentials!
            </p>
            <Link to="/products" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-700 shadow-md shadow-emerald-600/20 active:scale-[0.98] text-sm">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Items List */}
            <div className="flex-1 w-full space-y-3">
              {/* Free Delivery Threshold Progress Bar */}
              {freeThreshold > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-xs mb-3">
                  <div className="flex justify-between items-center text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1.5">
                    <span>
                      {isFreeDeliveryUnlocked
                        ? '🎉 Free Home Delivery unlocked!'
                        : `Add ₹${freeDeliveryGap.toFixed(0)} more for FREE Delivery`}
                    </span>
                    <span>₹{itemsTotal.toFixed(2)} / ₹{freeThreshold.toFixed(0)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-emerald-200/60 dark:bg-emerald-900 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 dark:bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (itemsTotal / freeThreshold) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {items.map((item) => {
                const stockQty = item.stock_quantity ?? 999;
                const maxOrderQty = item.max_order_quantity ?? 0;
                const isItemOutOfStock = item.is_in_stock === false || stockQty <= 0;
                const maxAllowed = maxOrderQty > 0 ? Math.min(stockQty, maxOrderQty) : stockQty;
                const isMaxReached = isItemOutOfStock || item.quantity >= maxAllowed;
                const unitPriceNum = parseFloat(item.unit_price || 0);
                const itemLineTotal = (unitPriceNum * item.quantity).toFixed(2);
                return (
                  <article key={item.id} className={`flex items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-900 p-3.5 shadow-xs border transition-colors ${isItemOutOfStock ? 'border-red-200 bg-red-50/20 dark:bg-red-950/20' : 'border-slate-200/80 dark:border-slate-800'}`}>
                    <div className="grid size-14 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 font-black text-lg text-emerald-700 dark:text-emerald-400 shrink-0">
                      {item.product_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900 dark:text-white text-sm sm:text-base">{item.product_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        ₹{item.unit_price} · {item.product_unit}
                        {item.regular_price && Number(item.regular_price) > unitPriceNum && (
                          <span className="ml-1.5 line-through text-slate-400 text-[11px]">₹{item.regular_price}</span>
                        )}
                        {item.quantity > 1 && (
                          <span className="ml-1.5 text-slate-700 dark:text-slate-300 font-bold">· ₹{itemLineTotal}</span>
                        )}
                      </p>
                      {isItemOutOfStock && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-900">
                          Out of Stock · Please remove
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-xs shrink-0 overflow-hidden ${isItemOutOfStock ? 'opacity-50' : ''}`}>
                      <button onClick={() => change(item, item.quantity - 1)} disabled={isItemOutOfStock} className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-100 transition-colors active:bg-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Minus size={15} /></button>
                      <span className="w-7 text-center text-xs font-black text-slate-900 dark:text-white">{item.quantity}</span>
                      <button onClick={() => change(item, item.quantity + 1)} disabled={isMaxReached || isItemOutOfStock} className={`p-2 transition-colors shrink-0 ${isMaxReached ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200 cursor-pointer'}`}><Plus size={15} /></button>
                    </div>
                    <button onClick={() => change(item, 0)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors shrink-0 cursor-pointer">
                      <Trash2 size={17} />
                    </button>
                  </article>
                );
              })}
            </div>

            {/* Promo Code & Order Summary Section (Sticky Sidebar on Desktop) */}
            <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-24 space-y-4">
              {/* Promo Code Section */}
              <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800">
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="Enter promo code" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-500 text-xs sm:text-sm font-semibold transition-all"/>
                  <button type="submit" disabled={!promoInput} className="rounded-xl bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 px-4 py-2.5 font-bold text-xs sm:text-sm text-white disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-xs active:scale-95 disabled:active:scale-100 cursor-pointer">Apply</button>
                </form>
                {promoError && <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-bold">{promoError}</p>}
                {cart?.promo_code && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-100 dark:border-emerald-800/50 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 shadow-xs">
                    <div><span className="font-extrabold uppercase tracking-wider text-[10px] block text-emerald-600 dark:text-emerald-400 mb-0.5">Code Applied</span><span className="font-bold">{cart.promo_code}</span></div>
                    <button onClick={() => applyPromo('')} className="text-xs font-bold bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg shadow-xs border border-emerald-200 dark:border-emerald-700 text-slate-800 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">Remove</button>
                  </div>
                )}
              </section>

              {/* Order Summary Section */}
              <section className="rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs border border-slate-200/80 dark:border-slate-800">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-3.5">Bill Details</h2>
                <div className="space-y-2.5 text-xs sm:text-sm">
                  {discount > 0 ? (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                        <span>Item MRP Total</span>
                        <span className="text-slate-900 dark:text-white font-bold">₹{mrpTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium">
                        <span>Product Savings</span>
                        <span className="font-bold">- ₹{discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium border-t border-dashed border-slate-200 dark:border-slate-800 pt-1.5">
                        <span>Item Subtotal</span>
                        <span className="text-slate-900 dark:text-white font-bold">₹{itemsTotal.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Item Subtotal</span>
                      <span className="text-slate-900 dark:text-white font-bold">₹{itemsTotal.toFixed(2)}</span>
                    </div>
                  )}

                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{promoDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  {packagingFee > 0 && (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400 font-medium">
                      <span>Packaging Fee</span>
                      <span className="text-slate-900 dark:text-white font-bold">₹{packagingFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-3.5 text-lg font-black text-slate-900 dark:text-white">
                  <span>Total Payable</span>
                  <span className="text-emerald-600 dark:text-emerald-400">₹{totalPayable.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="mt-3 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center text-xs font-black text-emerald-800 dark:text-emerald-300">
                    🎉 You are saving ₹{discount.toFixed(2)} on this order!
                  </div>
                )}

                {storeSettings?.is_open === false ? (
                  <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/40 p-3.5 text-center font-bold text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900 text-xs sm:text-sm">The store is currently closed.</div>
                ) : isEmergencyPaused ? (
                  <div className="mt-4 p-3.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-center font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm">
                    Order Placement Paused: {emergencyPauseMsg}
                  </div>
                ) : isClosedHours ? (
                  <div className="mt-4 p-3.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-center font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm">
                    Store Closed: Outside scheduled operating hours
                  </div>
                ) : hasOutOfStock ? (
                  <div className="mt-4 rounded-xl bg-red-50 dark:bg-red-950/60 p-3.5 text-center font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 text-xs sm:text-sm">
                    Remove out-of-stock items before checkout
                  </div>
                ) : isBelowMinOrder ? (
                  <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-3.5 text-center font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800 text-xs sm:text-sm">Minimum order amount is ₹{minOrderAmount.toFixed(0)}</div>
                ) : (
                  <>
                    <button onClick={() => navigate('/checkout')} className="mt-4 w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-white shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98] text-sm sm:text-base py-3 cursor-pointer flex items-center justify-center gap-2">
                      Proceed to Checkout →
                    </button>
                    <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pay securely online or at store pickup.</p>
                  </>
                )}
              </section>
            </div>

            {/* Mobile Sticky Checkout Bar (strictly mobile: lg:hidden) */}
            {storeSettings?.is_open !== false && !isEmergencyPaused && !isClosedHours && !hasOutOfStock && !isBelowMinOrder && items.length > 0 && (
              <div className="lg:hidden fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] inset-x-0 z-30 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 py-3 px-4 shadow-[0_-10px_20px_-3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between gap-4 w-full">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Payable</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-0.5">₹{totalPayable.toFixed(2)}</p>
                  </div>
                  <button onClick={() => navigate('/checkout')} className="flex-1 min-h-[44px] py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] font-black text-white shadow-md shadow-emerald-600/20 transition-all text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer">
                    Proceed to Checkout →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </CustomerLayout>
  );
}

export function extractErrorMessage(err, fallback = 'Could not place your order.') {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (data.detail && typeof data.detail === 'string') return data.detail;
  if (data.error && typeof data.error === 'string') return data.error;
  if (data.message && typeof data.message === 'string') return data.message;
  if (typeof data === 'object') {
    const values = Object.values(data);
    for (const val of values) {
      if (Array.isArray(val) && val.length > 0) return String(val[0]);
      if (typeof val === 'string' && val.trim().length > 0) return val;
    }
  }
  return fallback;
}

export function CheckoutPage() {
   const navigate = useNavigate(); 
   const { cart, isCustomer, storeSettings, refresh, clearCart } = useCart(); 
   const [time, setTime] = useState('As soon as possible'); 
   const [note, setNote] = useState(''); 
   const [error, setError] = useState(''); 
   const [loading, setLoading] = useState(false);
   const [walletBalance, setWalletBalance] = useState(0); 
   const [useWallet, setUseWallet] = useState(false);
   const [orderType, setOrderType] = useState('PICKUP');
   const [deliveryAddress, setDeliveryAddress] = useState('');
   const [deliveryPincode, setDeliveryPincode] = useState('');

   // Payment Method State
   const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'UPI'
   const [qrViewMode, setQrViewMode] = useState('dynamic'); // 'dynamic' | 'standee'
   const [upiTransactionId, setUpiTransactionId] = useState('');

   // Time Slot State
   const enableTimeSlots = Boolean(storeSettings?.enable_time_slots);
   const allTimeSlots = parseTimeSlots(storeSettings?.time_slots_json);
   const bufferMinutes = Number(storeSettings?.preparation_buffer_minutes || 0);

   const [slotDay, setSlotDay] = useState('today'); // 'today' | 'tomorrow'
   const [selectedSlotLabel, setSelectedSlotLabel] = useState('');

   const todaySlots = allTimeSlots.filter(s => !isSlotPassedToday(s, bufferMinutes));
   const tomorrowSlots = allTimeSlots;
   const activeSlotList = slotDay === 'today' ? todaySlots : tomorrowSlots;

   const todayStr = getLocalDateStr(new Date());
   const tomorrowDate = new Date();
   tomorrowDate.setDate(tomorrowDate.getDate() + 1);
   const tomorrowStr = getLocalDateStr(tomorrowDate);

   // Auto-switch to tomorrow if today has no slots left
   useEffect(() => {
     if (enableTimeSlots && allTimeSlots.length > 0) {
       if (todaySlots.length === 0 && slotDay === 'today') {
         setSlotDay('tomorrow');
       }
     }
   }, [enableTimeSlots, allTimeSlots.length, todaySlots.length]);

   // Ensure an active slot is selected
   useEffect(() => {
     if (enableTimeSlots && activeSlotList.length > 0) {
       const exists = activeSlotList.some(s => s.label === selectedSlotLabel);
       if (!exists) {
         setSelectedSlotLabel(activeSlotList[0].label);
         setTime(activeSlotList[0].label);
       }
     }
   }, [enableTimeSlots, slotDay, activeSlotList]);

   // Emergency Pause & Operating Hours
   const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
   const emergencyPauseMsg = storeSettings?.emergency_pause_message || 'Online ordering is temporarily paused by the store due to high volume. We apologize for any inconvenience.';
   const operatingHours = checkOperatingHours(storeSettings);
   const isClosedHours = operatingHours.isClosed;
   
   // New Address Management State
   const [addresses, setAddresses] = useState([]);
   const [selectedAddressId, setSelectedAddressId] = useState(null);
   const [showAddressForm, setShowAddressForm] = useState(false);
   const [editingAddressId, setEditingAddressId] = useState(null);
   const [addressForm, setAddressForm] = useState({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });
   
   const captureLocation = () => {
     const loadingToast = toast.loading("Getting your exact location...");
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => {
             setAddressForm({...addressForm, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))});
             toast.success("Location captured successfully!", { id: loadingToast });
         },
         (err) => {
             toast.error("Could not fetch location. Please enable GPS.", { id: loadingToast });
         }
       );
     } else {
       toast.error("Geolocation not supported.", { id: loadingToast });
     }
   };

   const fetchAddresses = () => {
     api.get('/auth/addresses/').then(res => {
       const data = res.data.results || res.data;
       setAddresses(data);
       if (data && data.length > 0 && !selectedAddressId) {
         const defaultAddr = data.find(a => a.is_default) || data[0];
         setSelectedAddressId(defaultAddr.id);
       }
     }).catch(console.error);
   };

   useEffect(() => {
     if (isCustomer) {
       api.get('/auth/wallet/').then(res => setWalletBalance(parseFloat(res.data.balance))).catch(console.error);
       fetchAddresses();
     }
   }, [isCustomer]);

   // Whenever selected address changes, update the string fields for the backend payload
   useEffect(() => {
     if (selectedAddressId) {
       const addr = addresses.find(a => a.id === selectedAddressId);
       if (addr) {
         const formatted = [addr.street, addr.landmark, addr.city, addr.state].filter(Boolean).join(', ');
         setDeliveryAddress(formatted);
         setDeliveryPincode(addr.zip_code || '');
       }
     }
   }, [selectedAddressId, addresses]);

   const saveAddress = async (e) => {
     e.preventDefault();
     setLoading(true);
     try {
       if (editingAddressId) {
         await api.put(`/auth/addresses/${editingAddressId}/`, addressForm);
       } else {
         const res = await api.post('/auth/addresses/', addressForm);
         setSelectedAddressId(res.data.id);
         setAddresses(prev => [...prev, res.data]);
       }
       setShowAddressForm(false);
       setEditingAddressId(null);
       fetchAddresses();
     } catch (err) {
       setError(err.response?.data?.latitude?.[0] || err.response?.data?.detail || 'Failed to save address.');
     } finally {
       setLoading(false);
     }
   };

 if (!isCustomer) return <CartPage />;
 
  const mrpTotal = parseFloat(cart?.subtotal || 0);
  const discount = parseFloat(cart?.discount || 0);
  const itemsTotal = parseFloat(cart?.items_total || 0) || Math.max(0, mrpTotal - discount);
  const isDeliveryUnderMin = orderType === 'DELIVERY' && parseFloat(storeSettings?.min_delivery_order_amount) > 0 && itemsTotal < parseFloat(storeSettings.min_delivery_order_amount);

  const isHomeDeliveryActive = Boolean(storeSettings?.is_home_delivery_active || storeSettings?.delivery_mode === 'BOTH' || storeSettings?.delivery_mode === 'DELIVERY');

  let deliveryFee = 0;
  if (orderType === 'DELIVERY' && isHomeDeliveryActive) {
    if (parseFloat(storeSettings?.free_delivery_threshold) > 0 && itemsTotal >= parseFloat(storeSettings.free_delivery_threshold)) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || 0);
    }
  }
  const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;

 // Max wallet percentage limit
 const maxWalletPercentage = storeSettings?.max_wallet_usage_percentage != null && Number(storeSettings.max_wallet_usage_percentage) > 0 
   ? Number(storeSettings.max_wallet_usage_percentage) 
   : 100;
 const maxWalletAllowed = (cartTotal * maxWalletPercentage) / 100;
 const walletApplied = useWallet ? Math.min(walletBalance, maxWalletAllowed, cartTotal) : 0;
 const finalTotal = Math.max(0, cartTotal - walletApplied);

 // Dynamic UPI Details
 const upiId = storeSettings?.upi_id || 'narendrakirana@okaxis';
 const upiPayee = storeSettings?.upi_payee_name || storeSettings?.store_name || 'Narendra Kirana';
 const upiUri = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${finalTotal.toFixed(2)}&cu=INR&tn=Order`;
 const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUri)}`;

 async function submit() { 
  if (isEmergencyPaused) {
    setError(emergencyPauseMsg);
    return;
  }
  if (isClosedHours) {
    setError(operatingHours.message);
    return;
  }
  const hasOutOfStock = (cart?.items || []).some(item => item.is_in_stock === false || (item.stock_quantity !== undefined && item.stock_quantity <= 0));
  if (hasOutOfStock) {
    setError('Some items in your cart are currently out of stock. Please return to your cart and remove them before placing your order.');
    return;
  }
  if (isDeliveryUnderMin) {
    setError(`Minimum delivery order amount is ₹${storeSettings.min_delivery_order_amount}`);
    return;
  }
  if (orderType === 'DELIVERY') {
    if (!selectedAddressId && (!deliveryAddress.trim() || !deliveryPincode.trim())) { 
        setError('Please select or add a delivery address.'); 
        return; 
    }
  }
  if (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel) {
    setError('Please select a time slot for your order.');
    return;
  }

  setLoading(true); 
  setError(''); 
  try { 
    const isPickup = orderType === 'PICKUP';
    const chosenSlotDate = enableTimeSlots && allTimeSlots.length > 0 ? (slotDay === 'today' ? todayStr : tomorrowStr) : null;
    const chosenSlotLabel = enableTimeSlots && allTimeSlots.length > 0 ? selectedSlotLabel : null;
    const effectivePaymentMethod = finalTotal === 0 ? 'WALLET' : paymentMethod;

    const payload = { 
      pickup_time: chosenSlotLabel || time, 
      customer_note: note, 
      use_wallet: useWallet,
      order_type: orderType,
      delivery_address: isPickup ? '' : deliveryAddress,
      delivery_pincode: isPickup ? '' : deliveryPincode,
      delivery_latitude: isPickup ? null : (() => {
        const lat = selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.latitude : null;
        return (lat != null && lat !== '' && !isNaN(Number(lat))) ? Number(lat) : null;
      })(),
      delivery_longitude: isPickup ? null : (() => {
        const lng = selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.longitude : null;
        return (lng != null && lng !== '' && !isNaN(Number(lng))) ? Number(lng) : null;
      })(),
      delivery_slot_date: chosenSlotDate || null,
      delivery_slot_label: chosenSlotLabel || '',
      payment_method: effectivePaymentMethod,
      upi_transaction_id: effectivePaymentMethod === 'UPI' ? upiTransactionId : ''
    };

    const response = await api.post('/orders/', payload); 
    if (clearCart) await clearCart().catch(() => {});
    await refresh(); 
    navigate(`/orders/${response.data.id}`);
  } catch (requestError) { 
    setError(extractErrorMessage(requestError, 'Could not place your order.'));
  } finally { 
    setLoading(false);
  } 
 }

 const isOrderBlocked = isEmergencyPaused || isClosedHours || storeSettings?.is_open === false;

  return (
    <CustomerLayout>
      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-5 sm:py-8 pb-36 sm:pb-16">
        <button
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline bg-transparent border-0 cursor-pointer"
        >
          <ArrowLeft size={16} /> Back to Cart
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Checkout</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">Review your order details and choose delivery or pickup.</p>

        {/* Emergency Pause Notice */}
        {isEmergencyPaused && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-start gap-2.5 animate-in fade-in">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="block font-black uppercase text-[11px] tracking-wider text-amber-800 dark:text-amber-300 mb-0.5">
                Orders Temporarily Paused
              </span>
              {emergencyPauseMsg}
            </div>
          </div>
        )}

        {/* Operating Hours Notice */}
        {isClosedHours && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-bold flex items-start gap-2.5 animate-in fade-in">
            <Clock size={20} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="block font-black uppercase text-[11px] tracking-wider text-rose-800 dark:text-rose-300 mb-0.5">
                Store Outside Operating Hours
              </span>
              {operatingHours.message}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/50 text-xs sm:text-sm font-bold text-red-700 dark:text-rose-300 animate-in fade-in">
            {error}
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs border border-slate-100 dark:border-slate-800">
          {/* Order Type Toggle */}
          <div className="mb-5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">Order Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl gap-1.5">
              <button
                type="button"
                onClick={() => setOrderType('PICKUP')}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  orderType === 'PICKUP'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span>🏪</span> Store Pickup
              </button>
              <button
                type="button"
                onClick={() => isHomeDeliveryActive ? setOrderType('DELIVERY') : null}
                className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  orderType === 'DELIVERY'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500'
                } ${!isHomeDeliveryActive ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                <span>🛵</span> Home Delivery {!isHomeDeliveryActive && '(Unavailable)'}
              </button>
            </div>
          </div>

          {/* Time Slot Selector or Pickup Time */}
          {enableTimeSlots && allTimeSlots.length > 0 ? (
            <div className="mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar size={15} className="text-emerald-600 dark:text-emerald-400" />
                  Select {orderType === 'PICKUP' ? 'Pickup' : 'Delivery'} Time Slot
                </label>
                {storeSettings?.preparation_buffer_minutes > 0 && (
                  <span className="text-[11px] text-slate-400">
                    Prep buffer: {storeSettings.preparation_buffer_minutes}m
                  </span>
                )}
              </div>

              {/* Day Selector (Today / Tomorrow) */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setSlotDay('today')}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                    slotDay === 'today'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Today ({new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                  {todaySlots.length === 0 && <span className="block text-[10px] font-normal opacity-80">(No slots left)</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setSlotDay('tomorrow')}
                  className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-xl border transition-all cursor-pointer ${
                    slotDay === 'tomorrow'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  Tomorrow ({tomorrowDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })})
                </button>
              </div>

              {/* Slots List */}
              {activeSlotList.length === 0 ? (
                <div className="p-3 text-center rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs font-semibold text-amber-800 dark:text-amber-200">
                  All slots for today have closed or passed the preparation buffer. Please choose <button type="button" onClick={() => setSlotDay('tomorrow')} className="font-bold underline text-emerald-700 dark:text-emerald-400">Tomorrow</button>.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {activeSlotList.map((slot) => {
                    const isSelected = selectedSlotLabel === slot.label;
                    return (
                      <button
                        key={slot.id || slot.label}
                        type="button"
                        onClick={() => {
                          setSelectedSlotLabel(slot.label);
                          setTime(slot.label);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center flex items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {isSelected && <Check size={13} className="text-emerald-600 dark:text-emerald-400" />}
                        <span>{slot.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : orderType === 'PICKUP' ? (
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
                Pickup time
              </label>
              <select
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
              >
                <option>As soon as possible</option>
                <option>In 30 minutes</option>
                <option>In 1 hour</option>
              </select>
            </div>
          ) : null}

          {/* Delivery Address Section (Home Delivery) */}
          {orderType === 'DELIVERY' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Select Delivery Address
                </label>
                {!showAddressForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddressForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });
                      setEditingAddressId(null);
                      setShowAddressForm(true);
                    }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    + Add New
                  </button>
                )}
              </div>

              {showAddressForm ? (
                <form onSubmit={saveAddress} className="bg-slate-50 dark:bg-slate-800/60 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{editingAddressId ? 'Edit Address' : 'New Address'}</h4>
                    <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer">Cancel</button>
                  </div>
                  {!addressForm.latitude ? (
                    <button type="button" onClick={captureLocation} className="w-full font-extrabold text-xs sm:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 cursor-pointer">
                      <MapPin size={16} className="text-indigo-600" />
                      Capture My Exact Location (GPS)
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs sm:text-sm">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span>GPS Location Secured</span>
                      </div>
                      <button type="button" onClick={captureLocation} className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors shadow-xs active:scale-95 cursor-pointer">
                        <RefreshCw size={13} /> Relocate
                      </button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <input placeholder="Title (e.g. Home, Office)" value={addressForm.title} onChange={e => setAddressForm({...addressForm, title: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div className="col-span-2">
                      <textarea placeholder="House/Flat No, Street Address *" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"></textarea>
                    </div>
                    <div className="col-span-2">
                      <input placeholder="Landmark (Optional)" value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <input placeholder="City *" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div>
                      <input placeholder="State *" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div className="col-span-2">
                      <input placeholder="Pincode *" value={addressForm.zip_code} onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})} required className="w-full text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 sm:p-3 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 text-white font-bold text-xs sm:text-sm py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer">
                    Save Address
                  </button>
                </form>
              ) : (
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                  {addresses.length === 0 ? (
                    <div className="p-4 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl text-center text-xs sm:text-sm text-slate-500">
                      No saved addresses found. Please add a delivery address above.
                    </div>
                  ) : (
                    addresses.map(addr => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          selectedAddressId === addr.id
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 dark:border-indigo-500'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                          {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-indigo-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{addr.title}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setAddressForm(addr); setEditingAddressId(addr.id); setShowAddressForm(true); }}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-0.5"
                              title="Edit address"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{addr.street}</p>
                          {addr.landmark && <p className="text-xs text-slate-500 dark:text-slate-400">{addr.landmark}</p>}
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{addr.city}, {addr.state} - {addr.zip_code}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {parseFloat(storeSettings?.min_delivery_order_amount) > 0 && parseFloat(cart?.subtotal) < parseFloat(storeSettings.min_delivery_order_amount) && (
                <div className="p-3 bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 text-xs sm:text-sm font-bold rounded-xl border border-red-100 dark:border-rose-900/50">
                  Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
                </div>
              )}
            </div>
          )}

          {/* Note for the store */}
          <div className="mt-5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Note for the store (optional)
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="E.g., Please pack fragile items carefully..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none h-18"
            />
          </div>

          {/* Payment Method Selection */}
          {finalTotal > 0 && (
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2.5 mb-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'COD'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70'
                  }`}
                >
                  <span>💵</span>
                  <span>{orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Pay at Store'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border-indigo-500 shadow-xs ring-2 ring-indigo-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-transparent hover:bg-slate-200/70'
                  }`}
                >
                  <QrCode size={16} />
                  <span>UPI / Dynamic QR</span>
                </button>
              </div>

              {/* Dynamic UPI Section */}
              {paymentMethod === 'UPI' && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/50 shadow-xs animate-in fade-in slide-in-from-top-2">
                  {/* Toggle between Dynamic QR & Physical Standee */}
                  {storeSettings?.upi_qr_image && (
                    <div className="flex justify-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setQrViewMode('dynamic')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                          qrViewMode === 'dynamic'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Dynamic QR (₹{finalTotal.toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrViewMode('standee')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                          qrViewMode === 'standee'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Store Standee QR
                      </button>
                    </div>
                  )}

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    {qrViewMode === 'standee' && storeSettings?.upi_qr_image ? (
                      <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 mb-2">
                        <img
                          src={storeSettings.upi_qr_image}
                          alt="Store Standee QR"
                          className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 mb-2 flex items-center justify-center">
                        <QRCodeSVG
                          value={upiUri}
                          size={190}
                          level="M"
                          includeMargin={false}
                          className="w-44 h-44 sm:w-48 sm:h-48"
                        />
                      </div>
                    )}

                    <p className="text-xs font-extrabold text-slate-900 dark:text-white mb-0.5">
                      Scan with any UPI app to pay ₹{finalTotal.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                      Google Pay · PhonePe · Paytm · BHIM
                    </p>

                    {/* Copyable UPI ID */}
                    <div className="w-full max-w-xs flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-3">
                      <div className="min-w-0 flex-1 text-left mr-2">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block leading-tight">UPI ID</span>
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate block">{upiId}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(upiId);
                          toast.success('UPI ID copied to clipboard!');
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 flex items-center gap-1 shrink-0 shadow-2xs cursor-pointer"
                      >
                        <Copy size={12} /> Copy
                      </button>
                    </div>

                    {/* UPI Reference / UTR Number Input */}
                    <div className="w-full text-left">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        UPI Reference / UTR Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={upiTransactionId}
                        onChange={(e) => setUpiTransactionId(e.target.value.trim())}
                        placeholder="e.g. 423589123456"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 font-mono outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Provide your 12-digit transaction UTR for faster payment confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Digital Wallet */}
          {walletBalance > 0 && (
            <div className="mt-5 p-3.5 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">Use Wallet Balance</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">Available: ₹{walletBalance.toFixed(2)}</div>
                {maxWalletPercentage < 100 && (
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                    Up to {maxWalletPercentage}% of order can be paid via wallet (max ₹{maxWalletAllowed.toFixed(2)})
                  </p>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
                <div className="w-11 h-6 bg-emerald-200 dark:bg-emerald-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-emerald-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          )}

          {/* Order Summary breakdown */}
          <div className="mt-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4">
            {discount > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Item MRP Total</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 line-through">₹{mrpTotal.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Product Savings</span>
                <span>- ₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-700 dark:text-slate-200">
              <span className="font-medium">{discount > 0 ? 'Item Subtotal' : 'Subtotal'}</span>
              <span className="font-bold text-slate-900 dark:text-white">₹{itemsTotal.toFixed(2)}</span>
            </div>
            {parseFloat(cart?.promo_discount || 0) > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Promo Discount</span>
                <span>- ₹{parseFloat(cart.promo_discount).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(cart?.packaging_fee || 0) > 0 && (
              <div className="flex justify-between">
                <span>Packaging Fee</span>
                <span>₹{parseFloat(cart.packaging_fee).toFixed(2)}</span>
              </div>
            )}
            {orderType === 'DELIVERY' && (
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className={deliveryFee === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'font-bold'}>
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                </span>
              </div>
            )}
            {useWallet && walletApplied > 0 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Wallet Applied</span>
                <span>- ₹{walletApplied.toFixed(2)}</span>
              </div>
            )}
            {(discount > 0 || parseFloat(cart?.promo_discount || 0) > 0) && (
              <div className="py-2 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                <span>🎉 Total Savings on this order:</span>
                <span>₹{(discount + parseFloat(cart?.promo_discount || 0)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base sm:text-lg font-black text-slate-900 dark:text-white pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <span>Total Due</span>
              <span className="text-emerald-700 dark:text-emerald-400">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action CTAs */}
          {storeSettings?.is_open === false ? (
            <div className="mt-5 rounded-xl bg-red-50 dark:bg-rose-950/40 p-4 text-center font-bold text-red-700 dark:text-rose-300 border border-red-100 dark:border-rose-900/50 text-xs sm:text-sm">
              The store is currently closed. Cannot place order.
            </div>
          ) : isEmergencyPaused ? (
            <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-center font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs sm:text-sm">
              Online ordering is temporarily paused by the store: {emergencyPauseMsg}
            </div>
          ) : isClosedHours ? (
            <div className="mt-5 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-4 text-center font-bold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs sm:text-sm">
              Store Outside Operating Hours: {operatingHours.message}
            </div>
          ) : Number(storeSettings?.min_order_amount) > 0 && itemsTotal < Number(storeSettings.min_order_amount) ? (
            <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-center font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 text-xs sm:text-sm">
              Minimum order amount is ₹{storeSettings.min_order_amount}
            </div>
          ) : (
            <>
              {isDeliveryUnderMin && (
                <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/40 p-4 text-center font-bold text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50 text-xs sm:text-sm">
                  Minimum delivery order amount is ₹{storeSettings.min_delivery_order_amount}
                </div>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={
                  loading || 
                  isOrderBlocked || 
                  isDeliveryUnderMin || 
                  (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode)) ||
                  (enableTimeSlots && allTimeSlots.length > 0 && !selectedSlotLabel)
                }
                className="mt-6 min-h-[48px] py-3.5 px-6 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] font-extrabold text-white text-sm sm:text-base shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={16} /> Placing Order...
                  </span>
                ) : isEmergencyPaused ? (
                  'Ordering Temporarily Paused'
                ) : isClosedHours ? (
                  'Outside Store Operating Hours'
                ) : finalTotal > 0 ? (
                  paymentMethod === 'UPI' ? (
                    'Place Order (Pay via UPI QR)'
                  ) : orderType === 'DELIVERY' ? (
                    'Place Order (Cash on Delivery)'
                  ) : (
                    'Place Order (Pay at Store)'
                  )
                ) : (
                  'Place Order (Paid via Wallet)'
                )}
              </button>
            </>
          )}
        </div>
      </main>
    </CustomerLayout>
  );
}

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = () =>
      api
        .get(`/orders/${id}/`, { params: { t: Date.now() } })
        .then((response) => setOrder(response.data))
        .catch(() => setError('Could not load this order.'));
    fetchOrder();
    const intervalId = setInterval(fetchOrder, 5000);
    return () => clearInterval(intervalId);
  }, [id]);

  const statusRankMap = {
    NEW: 0,
    ACCEPTED: 1,
    PREPARING: 2,
    READY: 3,
    OUT_FOR_DELIVERY: 4,
    COMPLETED: 5,
  };

  const getSteps = (type = 'DELIVERY') => [
    { id: 'NEW', rank: 0, label: 'Order Placed', desc: 'We received your order', icon: CheckCircle2 },
    { id: 'ACCEPTED', rank: 1, label: 'Order Accepted', desc: 'Store confirmed your order', icon: CheckCircle2 },
    { id: 'PREPARING', rank: 2, label: 'Preparing', desc: 'Store is packing your items', icon: PackageSearch },
    { id: 'READY', rank: 3, label: type === 'DELIVERY' ? 'Ready for Handover' : 'Ready for Pickup', desc: type === 'DELIVERY' ? 'Packed and awaiting rider' : 'Waiting for you at the store', icon: type === 'DELIVERY' ? Package : Store },
    ...(type === 'DELIVERY' ? [{ id: 'OUT_FOR_DELIVERY', rank: 4, label: 'Out for Delivery', desc: 'Rider is on the way to you!', icon: Truck }] : []),
    { id: 'COMPLETED', rank: 5, label: type === 'DELIVERY' ? 'Delivered' : 'Completed', desc: type === 'DELIVERY' ? 'Order delivered successfully' : 'Order picked up successfully', icon: CheckCircle2 }
  ];

  return (
    <CustomerLayout>
      <main className="mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 pb-24 md:pb-12">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0"
        >
          <ArrowLeft size={16} /> Back
        </button>

        {error && <p className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {!order && !error && <p className="text-slate-500">Loading order...</p>}

        {order && (
          <>
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                <p className="text-sm font-bold text-primary-700">Order confirmed</p>
                <h1 className="mt-1 text-3xl font-extrabold">{order.id}</h1>
              </div>
              {order.status === 'COMPLETED' && (
                <Link
                  to={`/orders/${order.id}/invoice`}
                  className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition block text-center shadow-sm"
                >
                  View Invoice
                </Link>
              )}
            </div>

            {/* Delivery OTP Card for Customer Verification */}
            {order.order_type === 'DELIVERY' && order.delivery_otp && order.status !== 'COMPLETED' && (
              <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 rounded-2xl p-4 sm:p-5 border border-emerald-500/30 mb-6 flex items-center justify-between gap-4 shadow-sm">
                <div>
                  <p className="text-xs uppercase font-black tracking-wider text-emerald-700 dark:text-emerald-400">
                    Delivery Verification OTP
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Share this OTP with your delivery partner upon arrival:
                  </p>
                  {order.delivery_partner_name && (
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      🛵 Rider: {order.delivery_partner_name} {order.delivery_partner_phone ? `(${order.delivery_partner_phone})` : ''}
                    </p>
                  )}
                </div>
                <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-2xl px-4 py-2 text-center shadow-md shrink-0">
                  <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                    {order.delivery_otp}
                  </span>
                </div>
              </div>
            )}

            {/* Tracking Timeline UI */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Track Order</h2>
              {order.status === 'REJECTED' ? (
                <div className="flex items-center gap-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 p-4 rounded-xl border border-red-100 dark:border-red-900">
                  <XCircle className="w-8 h-8 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg">Order Cancelled</h3>
                    <p className="text-sm opacity-90">This order was cancelled and any wallet balance has been refunded.</p>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800"></div>

                  <div className="space-y-6 relative">
                    {getSteps(order.order_type).map((step) => {
                      const currentRank = statusRankMap[order.status] ?? 0;
                      const isCompleted = currentRank >= step.rank;
                      const isActive = currentRank === step.rank;
                      const Icon = step.icon || CheckCircle2;

                      return (
                        <div key={step.id} className={`flex gap-4 items-start ${!isCompleted ? 'opacity-40' : ''}`}>
                          <div
                            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm transition-colors duration-500 ${
                              isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            } ${isActive ? 'ring-4 ring-emerald-100 dark:ring-emerald-950/60' : ''}`}
                          >
                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                          </div>
                          <div className="pt-2 flex-1">
                            <h4 className={`text-sm font-bold ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                              {step.label}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {order.customer_note && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
                <p className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 mb-1">Your Note</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{order.customer_note}</p>
              </div>
            )}
            {order.owner_note && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <p className="text-xs font-extrabold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Store Reply</p>
                <p className="text-sm text-emerald-900 dark:text-emerald-200">{order.owner_note}</p>
              </div>
            )}

            <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                Order Items
              </h2>
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex justify-between py-2 text-sm">
                  <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-medium'}>
                    {item.quantity} x {item.product_name_snapshot}
                    {item.status === 'REJECTED' && (
                      <span className="ml-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md">
                        Unavailable
                      </span>
                    )}
                  </span>
                  <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200 font-bold'}>
                    ₹{item.subtotal}
                  </span>
                </div>
              ))}

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Billing Summary</h2>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-slate-900 dark:text-white">
                      ₹
                      {(order.items || []).reduce(
                        (sum, item) => sum + (item.status !== 'REJECTED' ? parseFloat(item.subtotal || 0) : 0),
                        0
                      ).toFixed(2)}
                    </span>
                  </div>
                  {parseFloat(order.discount_applied || 0) > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                      <span>Product Savings</span>
                      <span>- ₹{order.discount_applied}</span>
                    </div>
                  )}
                  {parseFloat(order.promo_discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Promo Discount</span>
                      <span>- ₹{order.promo_discount}</span>
                    </div>
                  )}
                  {parseFloat(order.packaging_fee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Packaging Fee</span>
                      <span className="text-slate-900 dark:text-white">₹{order.packaging_fee}</span>
                    </div>
                  )}
                  {parseFloat(order.delivery_fee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span className="text-slate-900 dark:text-white">₹{order.delivery_fee}</span>
                    </div>
                  )}
                  {parseFloat(order.wallet_discount || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Wallet Applied</span>
                      <span>- ₹{order.wallet_discount}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-900 dark:text-white">
                    {order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Due'}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">₹{order.total_amount}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 text-center font-medium shadow-sm">
              {order.order_type === 'DELIVERY' ? (
                <>
                  <Truck className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  Delivery to: <br />
                  <strong className="text-slate-800 dark:text-slate-200">{order.delivery_address || 'Home Delivery'}</strong>
                  {order.delivery_pincode && (
                    <>
                      <br />
                      Pincode: {order.delivery_pincode}
                    </>
                  )}
                </>
              ) : (
                <>
                  <Store className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                  Pickup: <strong className="text-slate-800 dark:text-slate-200">{order.pickup_time || 'As soon as possible'}</strong> <br />
                  Pay at store
                </>
              )}
              {order.delivery_slot_label && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                  📅 <span className="font-bold">Scheduled Slot:</span> {order.delivery_slot_date ? `${order.delivery_slot_date} • ` : ''}
                  {order.delivery_slot_label}
                </div>
              )}
              {order.payment_method && (
                <div className="mt-1 text-xs">
                  💳 <span className="font-bold">Payment Method:</span>{' '}
                  {order.payment_method === 'UPI'
                    ? 'UPI / Online'
                    : order.payment_method === 'WALLET'
                    ? 'Wallet Balance'
                    : 'Cash on Delivery'}
                  {order.upi_transaction_id ? ` (Ref: ${order.upi_transaction_id})` : ''}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </CustomerLayout>
  );
}





