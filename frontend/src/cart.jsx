import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingBasket, ArrowLeft, Eye, EyeOff, CheckCircle2, PackageSearch, Truck, Store, XCircle, MapPin, Edit2, RefreshCw, Gift, Lock, Sparkles, Check, AlertCircle, ShieldCheck, MailCheck, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import api from './services/api'
import { CustomerLayout } from './customer-layout'
import { useCart } from './cart-context'

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const { syncUser } = useCart();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Parse redirect destination from query (?redirect=...) or location state
  const searchParams = new URLSearchParams(location.search);
  const rawRedirect = searchParams.get('redirect') || location.state?.from?.pathname || '/';
  const redirectTarget = decodeURIComponent(rawRedirect);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login/', { username: email, password });
      if (!data.user.is_customer) throw new Error('Please use the owner portal for this account.');
      localStorage.setItem('smart-kirana-customer-token', data.access);
      localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
      syncUser();
      toast.success('Signed in successfully!');
      navigate(redirectTarget, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || 'Unable to sign in.');
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

          {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

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

export function CartPage() {
 const navigate = useNavigate(); const { cart, isCustomer, storeSettings, update, applyPromo } = useCart(); const [error, setError] = useState(''); const [promoInput, setPromoInput] = useState(''); const [promoError, setPromoError] = useState(''); const items = cart?.items || []
 if (!isCustomer) return <CustomerLayout><main className="mx-auto max-w-xl p-6 text-center"><h1 className="text-2xl font-extrabold">Your cart</h1><p className="mt-3 text-slate-600">Sign in to add products and place a pickup order.</p><Link to="/login"className="mt-5 inline-block rounded-xl bg-primary-600 px-5 py-3 font-bold text-white transition-all hover:bg-primary-700 active:scale-[0.98]">Sign in</Link></main></CustomerLayout>
 async function change(item, quantity) { try { await update(item, quantity) } catch { setError('Could not update your cart.') } }
 
 async function handleApplyPromo(e) {
 e.preventDefault(); setPromoError('');
 try { await applyPromo(promoInput); setPromoInput(''); } catch(err) { setPromoError(err.response?.data?.detail || 'Invalid promo code'); }
 }

 return (
 <CustomerLayout>
 <main className="mx-auto max-w-6xl px-4 py-8">
 <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline">
   <ArrowLeft size={16} /> Back
 </button>
 <h1 className="text-3xl font-extrabold mb-6">Your cart</h1>
 {error && <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
 
 {!items.length ? (
 <div className="mt-5 rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-100 flex flex-col items-center">
 <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
 <ShoppingBasket size={48} />
 </div>
 <h2 className="text-xl font-bold text-slate-900 mb-2">Your cart is empty</h2>
 <p className="text-slate-500 mb-8 max-w-md mx-auto">Looks like you haven't added anything to your cart yet. Browse our products and discover great deals.</p>
 <Link to="/products"className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition hover:bg-primary-700 shadow-sm hover:shadow-md active:scale-[0.98]">
 Start Shopping
 </Link>
 </div>
 ) : (
 <div className="flex flex-col lg:flex-row gap-8 items-start">
 {/* Left Column: Items */}
 <div className="flex-1 w-full space-y-3">
 {items.map((item) => {
 const maxAllowed = item.max_order_quantity > 0 ? Math.min(item.stock_quantity, item.max_order_quantity) : item.stock_quantity;
 const isMaxReached = item.quantity >= maxAllowed;
 return (
 <article key={item.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
 <div className="grid size-16 place-items-center rounded-xl bg-slate-50 font-black text-xl text-primary-300 shrink-0">
 {item.product_name.charAt(0)}
 </div>
 <div className="min-w-0 flex-1">
 <p className="truncate font-bold text-slate-800 text-lg">{item.product_name}</p>
 <p className="text-sm text-slate-500 font-medium">â‚¹{item.unit_price} Â· {item.product_unit}</p>
 </div>
 <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm shrink-0 overflow-hidden">
 <button onClick={() => change(item, item.quantity - 1)} className="p-2.5 text-slate-600 hover:text-primary-700 hover:bg-primary-100 transition-colors active:bg-primary-200"><Minus size={18} /></button>
 <span className="w-8 text-center text-sm font-bold text-slate-900">{item.quantity}</span>
 <button onClick={() => change(item, item.quantity + 1)} disabled={isMaxReached} className={`p-2.5 transition-colors shrink-0 ${isMaxReached ? 'text-slate-300 cursor-not-allowed bg-slate-50' : 'text-slate-600 hover:text-primary-700 hover:bg-primary-100 active:bg-primary-200'}`}><Plus size={18} /></button>
 </div>
 <button onClick={() => change(item, 0)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0">
 <Trash2 size={20} />
 </button>
 </article>
 )})}
 </div>
 
 {/* Right Column: Summary */}
 <div className="w-full lg:w-96 shrink-0 space-y-5 sticky top-24">
 {/* Promo Code Section */}
 <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
 <form onSubmit={handleApplyPromo} className="flex gap-2">
 <input value={promoInput} onChange={e => setPromoInput(e.target.value.toUpperCase())} placeholder="Enter promo code"className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium"/>
  <button type="submit" disabled={!promoInput} className="rounded-xl bg-slate-900 dark:bg-slate-800 dark:border dark:border-slate-700 px-5 py-2.5 font-bold text-white disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95 disabled:active:scale-100">Apply</button>
  </form>
  {promoError && <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-bold">{promoError}</p>}
  {cart?.promo_code && (
  <div className="mt-4 flex items-center justify-between rounded-xl bg-green-50 dark:bg-emerald-950/40 p-4 border border-green-100 dark:border-emerald-800/50 text-sm text-green-700 dark:text-emerald-300 shadow-sm">
  <div><span className="font-extrabold uppercase tracking-wider text-xs block text-green-600 dark:text-emerald-400 mb-0.5">Code Applied</span><span className="font-bold text-base">{cart.promo_code}</span></div>
  <button onClick={() => applyPromo('')} className="text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg shadow-sm border border-green-200 dark:border-emerald-700 text-slate-800 dark:text-slate-200 hover:bg-green-100 dark:hover:bg-slate-700 transition-colors">Remove</button>
  </div>
  )}
 </section>

 {/* Order Summary Section */}
 <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
 <h2 className="text-lg font-extrabold text-slate-900 mb-4">Order Summary</h2>
 <div className="space-y-3">
 <div className="flex justify-between text-sm text-slate-600 font-medium"><span>Subtotal</span><span className="text-slate-900 font-bold">â‚¹{cart?.subtotal || '0.00'}</span></div>
 <div className="flex justify-between text-sm text-primary-700 font-medium"><span>Product Savings</span><span className="font-bold">â‚¹{cart?.discount || '0.00'}</span></div>
 {cart?.promo_discount > 0 && <div className="flex justify-between text-sm text-green-600 font-bold"><span>Promo Discount</span><span>- â‚¹{cart.promo_discount}</span></div>}
 {cart?.packaging_fee > 0 && <div className="flex justify-between text-sm text-slate-600 font-medium"><span>Packaging Fee</span><span className="text-slate-900 font-bold">â‚¹{cart.packaging_fee}</span></div>}
 </div>
 <div className="mt-5 flex justify-between border-t border-slate-100 pt-5 text-xl font-black text-slate-900"><span>Total Due</span><span>â‚¹{cart?.total || '0.00'}</span></div>
 
 {storeSettings?.is_open === false ? (
 <div className="mt-6 rounded-xl bg-red-50 p-4 text-center font-bold text-red-700 border border-red-100">The store is currently closed.</div>
 ) : Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount) ? (
 <div className="mt-6 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum order amount is â‚¹{storeSettings.min_order_amount}</div>
 ) : (
 <>
 <button onClick={() => navigate('/checkout')} className="mt-4 hidden lg:block min-h-11 w-full rounded-xl bg-primary-600 font-bold text-white shadow-sm hover:bg-primary-700 hover:shadow-md transition-all active:scale-[0.98] text-base py-2.5">Continue to pickup</button>
 <p className="mt-3 hidden lg:block text-center text-xs text-slate-500 font-medium">Pay securely online or at store pickup.</p>
 </>
 )}
 </section>
 </div>
 
 {/* Mobile Sticky Checkout Bar */}
 {storeSettings?.is_open !== false && !(Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount)) && items.length > 0 && (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] z-30 bg-white border-t border-slate-200 py-2 px-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] lg:hidden">
      <div className="flex items-center justify-between gap-4 max-w-md mx-auto">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Due</p>
          <p className="text-xl font-black text-slate-900 leading-none mt-0.5">â‚¹{cart?.total}</p>
        </div>
        <button onClick={() => navigate('/checkout')} className="flex-1 min-h-[38px] py-1.5 px-4 rounded-xl bg-primary-600 font-bold text-white shadow-sm active:scale-95 transition-all text-sm">
          Checkout
        </button>
      </div>
    </div>
  )}
 </div>
 )}
 </main>
 </CustomerLayout>
 )
}

export function CheckoutPage() {
   const navigate = useNavigate(); const { cart, isCustomer, storeSettings, refresh } = useCart(); const [time, setTime] = useState('As soon as possible'); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
   const [walletBalance, setWalletBalance] = useState(0); const [useWallet, setUseWallet] = useState(false);
   const [orderType, setOrderType] = useState('PICKUP');
   const [deliveryAddress, setDeliveryAddress] = useState('');
   const [deliveryPincode, setDeliveryPincode] = useState('');
   
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
         // Immediately inject into local state to prevent race conditions during checkout
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

 if (!isCustomer) return <CartPage />
 
 const cartSubtotal = parseFloat(cart?.subtotal || 0);
 const isDeliveryUnderMin = orderType === 'DELIVERY' && parseFloat(storeSettings?.min_delivery_order_amount) > 0 && cartSubtotal < parseFloat(storeSettings.min_delivery_order_amount);

 async function submit() { 
  if (isDeliveryUnderMin) {
    setError(`Minimum delivery order amount is ₹${storeSettings.min_delivery_order_amount}`);
    return;
  }
  if (orderType === 'DELIVERY') {
    if (!selectedAddressId && (!deliveryAddress.trim() || !deliveryPincode.trim())) { 
        setError('Please select or add a delivery address.'); return; 
    }
  }
  setLoading(true); setError(''); 
  try { 
    const isPickup = orderType === 'PICKUP';
    const response = await api.post('/orders/', { 
      pickup_time: time, 
      customer_note: note, 
      use_wallet: useWallet,
      order_type: orderType,
      delivery_address: isPickup ? '' : deliveryAddress,
      delivery_pincode: isPickup ? '' : deliveryPincode,
      delivery_latitude: isPickup ? null : (selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.latitude : null),
      delivery_longitude: isPickup ? null : (selectedAddressId ? addresses.find(a => a.id === selectedAddressId)?.longitude : null)
    }); 
    await refresh(); 
    navigate(`/orders/${response.data.id}`) 
  } catch (requestError) { 
    setError(requestError.response?.data?.detail || 'Could not place your order.') 
  } finally { 
    setLoading(false) 
  } 
 }
 
 let deliveryFee = 0;
 if (orderType === 'DELIVERY' && storeSettings?.is_home_delivery_active) {
   if (parseFloat(storeSettings.free_delivery_threshold) > 0 && cartSubtotal >= parseFloat(storeSettings.free_delivery_threshold)) {
     deliveryFee = 0;
   } else {
     deliveryFee = parseFloat(storeSettings.delivery_fee || 0);
   }
 }
 const cartTotal = parseFloat(cart?.total || 0) + deliveryFee;
 const finalTotal = useWallet ? Math.max(0, cartTotal - walletBalance) : cartTotal;
 const walletApplied = useWallet ? Math.min(cartTotal, walletBalance) : 0;

 return <CustomerLayout><main className="mx-auto max-w-xl px-4 py-6"><button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-0"><ArrowLeft size={16} /> Back</button><h1 className="text-3xl font-extrabold">Checkout</h1><p className="mt-2 text-slate-600">Review your order and pick a time.</p>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
  
  <div className="mb-6">
    <label className="text-sm font-bold block mb-2">Order Type</label>
    <div className="flex bg-slate-100 p-1 rounded-xl">
      <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${orderType === 'PICKUP' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ðŸª Store Pickup</button>
      <button 
        onClick={() => storeSettings?.is_home_delivery_active ? setOrderType('DELIVERY') : null} 
        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${orderType === 'DELIVERY' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'} ${!storeSettings?.is_home_delivery_active ? 'opacity-50 cursor-not-allowed' : 'hover:text-slate-700'}`}
      >
        ðŸ›µ Home Delivery {!storeSettings?.is_home_delivery_active && '(Unavailable)'}
      </button>
    </div>
  </div>

  {orderType === 'PICKUP' ? (
    <label className="text-sm font-bold block">Pickup time<select value={time} onChange={(event) => setTime(event.target.value)} className="mt-2 w-full rounded-lg border p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"><option>As soon as possible</option><option>In 30 minutes</option><option>In 1 hour</option></select></label>
  ) : (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-bold">Select Delivery Address</label>
        {!showAddressForm && (
            <button onClick={() => { setAddressForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null }); setEditingAddressId(null); setShowAddressForm(true); }} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">+ Add New</button>
        )}
      </div>

      {showAddressForm ? (
        <form onSubmit={saveAddress} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-sm text-slate-900">{editingAddressId ? 'Edit Address' : 'New Address'}</h4>
            <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
          {!addressForm.latitude ? (
            <button type="button" onClick={captureLocation} className="w-full font-extrabold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
              <MapPin size={18} className="text-indigo-600" />
              ðŸ“ Capture My Exact Location
            </button>
          ) : (
            <div className="flex items-center justify-between bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
                <CheckCircle2 size={18} className="text-emerald-500" />
                <span>GPS Secured</span>
              </div>
              <button type="button" onClick={captureLocation} className="flex items-center gap-1.5 text-xs font-bold bg-white text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm active:scale-95">
                <RefreshCw size={14} /> Relocate
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
             <div className="col-span-2">
               <input placeholder="Title (e.g. Home, Office)" value={addressForm.title} onChange={e => setAddressForm({...addressForm, title: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div className="col-span-2">
               <textarea placeholder="House/Flat No, Street" value={addressForm.street} onChange={e => setAddressForm({...addressForm, street: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"></textarea>
             </div>
             <div className="col-span-2">
               <input placeholder="Landmark (Optional)" value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div>
               <input placeholder="City" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div>
               <input placeholder="State" value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
             <div className="col-span-2">
               <input placeholder="Pincode" value={addressForm.zip_code} onChange={e => setAddressForm({...addressForm, zip_code: e.target.value})} required className="w-full text-sm rounded-lg border p-2.5 outline-none focus:ring-2 focus:ring-indigo-500"/>
             </div>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-2 bg-indigo-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">Save Address</button>
        </form>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {addresses.length === 0 ? (
                <div className="p-4 border border-slate-200 border-dashed rounded-xl text-center text-sm text-slate-500">No saved addresses. Please add one.</div>
            ) : (
                addresses.map(addr => (
                  <div key={addr.id} onClick={() => setSelectedAddressId(addr.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${selectedAddressId === addr.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-500' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'}`}>
                    <div className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedAddressId === addr.id ? 'border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
                        {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{addr.title}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setAddressForm(addr); setEditingAddressId(addr.id); setShowAddressForm(true); }} className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-1">
                                <Edit2 size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{addr.street}</p>
                        {addr.landmark && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{addr.landmark}</p>}
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">{addr.city}, {addr.state} - {addr.zip_code}</p>
                    </div>
                  </div>
                ))
            )}
        </div>
      )}
      
      {parseFloat(storeSettings?.min_delivery_order_amount) > 0 && parseFloat(cart?.subtotal) < parseFloat(storeSettings.min_delivery_order_amount) && (
        <div className="p-3 bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-rose-300 text-sm font-bold rounded-lg border border-red-100 dark:border-rose-900/50 mt-4">
          Home Delivery requires a minimum cart total of ₹{storeSettings.min_delivery_order_amount}.
        </div>
      )}
    </div>
  )}
  <label className="mt-4 block text-sm font-bold text-slate-900 dark:text-white">Note for the store (optional)<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="E.g., Please pack fragile items carefully..." className="mt-4 w-full rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none h-16" /></label>
 
 {walletBalance > 0 && (
   <div className="mt-5 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
     <div>
       <div className="font-bold text-emerald-800 dark:text-emerald-300">Use Wallet Balance</div>
       <div className="text-sm text-emerald-600 dark:text-emerald-400">Available: ₹{walletBalance.toFixed(2)}</div>
     </div>
     <label className="relative inline-flex items-center cursor-pointer">
       <input type="checkbox" className="sr-only peer" checked={useWallet} onChange={e => setUseWallet(e.target.checked)} />
       <div className="w-11 h-6 bg-emerald-200 dark:bg-emerald-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-emerald-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
     </label>
   </div>
 )}

 <div className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4"><div className="flex justify-between"><span>Subtotal</span><span>₹{cart?.subtotal || '0.00'}</span></div><div className="flex justify-between text-primary-700 dark:text-primary-400"><span>Product Savings</span><span>₹{cart?.discount || '0.00'}</span></div>{cart?.promo_discount > 0 && <div className="flex justify-between text-green-600 dark:text-emerald-400 font-bold"><span>Promo Discount</span><span>- ₹{cart.promo_discount}</span></div>}{cart?.packaging_fee > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span>₹{cart.packaging_fee}</span></div>}
   {orderType === 'DELIVERY' && <div className="flex justify-between"><span>Delivery Fee</span><span className={deliveryFee === 0 ? 'text-green-600 dark:text-emerald-400 font-bold' : ''}>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span></div>}
 {useWallet && walletApplied > 0 && <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold"><span>Wallet Applied</span><span>- ₹{walletApplied.toFixed(2)}</span></div>}
 <div className="flex justify-between text-lg font-extrabold text-slate-900 dark:text-white pt-2"><span>Total Due</span><span>₹{finalTotal.toFixed(2)}</span></div></div>
 {storeSettings?.is_open === false ? (
 <div className="mt-5 rounded-xl bg-red-50 p-4 text-center font-bold text-red-700 border border-red-100">The store is currently closed. Cannot place order.</div>
 ) : Number(storeSettings?.min_order_amount) > 0 && Number(cart.subtotal) < Number(storeSettings.min_order_amount) ? (
 <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum order amount is â‚¹{storeSettings.min_order_amount}</div>
 ) : (
  <>
  {isDeliveryUnderMin && (
    <div className="mt-5 rounded-xl bg-amber-50 p-4 text-center font-bold text-amber-700 border border-amber-100">Minimum delivery order amount is ₹{storeSettings.min_delivery_order_amount}</div>
  )}
  <button onClick={submit} disabled={loading || isDeliveryUnderMin || (orderType === 'DELIVERY' && !selectedAddressId && (!deliveryAddress || !deliveryPincode))} className="mt-4 min-h-10 py-2.5 px-4 w-full rounded-xl bg-primary-600 font-bold text-white disabled:bg-slate-300 hover:bg-primary-700 active:scale-[0.98] transition-all text-sm">{loading ? 'Processing...' : (finalTotal > 0 ? (orderType === 'DELIVERY' ? 'Place order (Cash on Delivery)' : 'Place order (Pay at store)') : 'Place order (Paid via Wallet)')}</button>
  </>
 )}
 </div></main></CustomerLayout>
}

export function OrderDetailPage() {
 const { id } = useParams(); const navigate = useNavigate(); const [order, setOrder] = useState(null); const [error, setError] = useState('')
 
 useEffect(() => {
  const fetchOrder = () => api.get(`/orders/${id}/`, { params: { t: Date.now() } }).then((response) => setOrder(response.data)).catch(() => setError('Could not load this order.'));
  fetchOrder();
  const intervalId = setInterval(fetchOrder, 5000); return () => clearInterval(intervalId); 
 }, [id]); 
 
 const getSteps = (type) => [
   { id: 'NEW', label: 'Order Placed', desc: 'We received your order', icon: CheckCircle2 },
   { id: 'ACCEPTED', label: 'Processing', desc: 'Store is packing your items', icon: PackageSearch },
   { id: 'READY', label: type === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup', desc: type === 'DELIVERY' ? 'Your order is on the way!' : 'Waiting for you at the store', icon: type === 'DELIVERY' ? Truck : Store },
   { id: 'COMPLETED', label: type === 'DELIVERY' ? 'Delivered' : 'Completed', desc: type === 'DELIVERY' ? 'Order delivered successfully' : 'Order picked up successfully', icon: CheckCircle2 }
 ];
 
 const statusIndex = ['NEW', 'ACCEPTED', 'READY', 'COMPLETED'];

 return (
  <CustomerLayout>
    <main className="mx-auto max-w-xl px-4 py-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline bg-transparent border-none cursor-pointer p-0">
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
              <Link to={`/orders/${order.id}/invoice`} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition block text-center shadow-sm">
                View Invoice
              </Link>
            )}
          </div>

          {/* Tracking Timeline UI */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-5">Track Order</h2>
            {order.status === 'REJECTED' ? (
              <div className="flex items-center gap-4 bg-red-50 text-red-700 p-4 rounded-xl border border-red-100">
                <XCircle className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Order Cancelled</h3>
                  <p className="text-sm opacity-90">This order was cancelled and any wallet balance has been refunded.</p>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-slate-100"></div>
                
                <div className="space-y-6 relative">
                  {getSteps(order.order_type).map((step, index) => {
                    const currentIndex = statusIndex.indexOf(order.status);
                    const isCompleted = currentIndex >= index;
                    const isActive = currentIndex === index;
                    const Icon = step.icon;

                    return (
                      <div key={step.id} className={`flex gap-4 items-start ${!isCompleted ? 'opacity-40' : ''}`}>
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm transition-colors duration-500 ${isCompleted ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'} ${isActive ? 'ring-4 ring-primary-100 dark:ring-primary-950/60' : ''}`}>
                          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <div className="pt-2 flex-1">
                          <h4 className={`text-sm font-bold ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-slate-900 dark:text-white'}`}>{step.label}</h4>
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
            <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs font-extrabold uppercase text-slate-500 mb-1">Your Note</p>
              <p className="text-sm text-slate-800">{order.customer_note}</p>
            </div>
          )}
          {order.owner_note && (
            <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-xl">
              <p className="text-xs font-extrabold uppercase text-primary-600 mb-1">Store Reply</p>
              <p className="text-sm text-primary-900">{order.owner_note}</p>
            </div>
          )}

          <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3">Order Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}>
                  {item.quantity} x {item.product_name_snapshot} 
                  {item.status === 'REJECTED' && <span className="ml-2 text-xs font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md">Unavailable</span>}
                </span>
                <span className={item.status === 'REJECTED' ? 'line-through text-slate-400' : 'text-slate-800 font-bold'}>â‚¹{item.subtotal}</span>
              </div>
            ))}
            
            <div className="mt-6 border-t border-slate-100 pt-4">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Billing Summary</h2>
              <div className="space-y-2 text-sm text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-900">â‚¹{order.items.reduce((sum, item) => sum + (item.status !== 'REJECTED' ? parseFloat(item.subtotal) : 0), 0).toFixed(2)}</span>
                </div>
                {parseFloat(order.discount_applied) > 0 && <div className="flex justify-between text-primary-700"><span>Product Savings</span><span>- â‚¹{order.discount_applied}</span></div>}
                {parseFloat(order.promo_discount) > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Promo Discount</span><span>- â‚¹{order.promo_discount}</span></div>}
                {parseFloat(order.packaging_fee) > 0 && <div className="flex justify-between"><span>Packaging Fee</span><span className="text-slate-900">â‚¹{order.packaging_fee}</span></div>}
                {parseFloat(order.delivery_fee) > 0 && <div className="flex justify-between"><span>Delivery Fee</span><span className="text-slate-900">â‚¹{order.delivery_fee}</span></div>}
                {parseFloat(order.wallet_discount) > 0 && <div className="flex justify-between text-emerald-600 font-bold"><span>Wallet Applied</span><span>- â‚¹{order.wallet_discount}</span></div>}
              </div>
              <div className="flex justify-between font-extrabold text-lg pt-3 mt-3 border-t border-slate-100">
                <span className="text-slate-900">{order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Due'}</span>
                <span className="text-primary-600">â‚¹{order.total_amount}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-100 text-sm text-slate-600 text-center font-medium shadow-sm">
            {order.order_type === 'DELIVERY' ? (
              <>
                <Truck className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                Delivery to: <br/>
                <strong className="text-slate-800">{order.delivery_address}</strong>
                {order.delivery_pincode && <><br/>Pincode: {order.delivery_pincode}</>}
              </>
            ) : (
              <>
                <Store className="w-5 h-5 mx-auto mb-2 text-slate-400" />
                Pickup: <strong className="text-slate-800">{order.pickup_time || 'As soon as possible'}</strong> <br/>
                Pay at store
              </>
            )}
          </div>
        </>
      )}
    </main>
  </CustomerLayout>
 );
}





