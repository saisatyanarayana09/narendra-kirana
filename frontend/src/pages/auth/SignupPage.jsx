import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle2, ShieldCheck, MailCheck, Copy, Sparkles, Check, AlertCircle, Gift, RefreshCw, XCircle, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../services/api';
import { CustomerLayout } from '../../customer-layout';
import { useCart } from '../../cart-context';
import GoogleIcon from '../../components/GoogleIcon';

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
  const { syncUser } = useCart();
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { first_name: '', email: '', mobile_number: '', password: '', confirm_password: '', referral_code: params.get('ref') || '' };
  });
  const [error, setError] = useState(''); 
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      setError('');
      try {
        const { data } = await api.post('/auth/google/customer/', {
          credential: tokenResponse.access_token,
          token_type: 'access_token',
          referral_code: form.referral_code || ''
        });
        localStorage.setItem('smart-kirana-customer-token', data.access);
        localStorage.setItem('smart-kirana-customer-refresh', data.refresh);
        localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data.user));
        syncUser();
        toast.success('Account ready with Google! Welcome 🎉');
        navigate(redirectTarget || '/', { replace: true });
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not sign up with Google.');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      toast.error('Google Sign-Up was cancelled or failed.');
    }
  });
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

  function handleOpenInApp() {
    const code = form.referral_code?.trim().toUpperCase();
    const query = code ? `signup?ref=${encodeURIComponent(code)}` : 'signup';
    openAppOrFallback(query);
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

          {/* 1-Tap Google Sign Up */}
          <div className="mt-5">
            <button
              type="button"
              disabled={googleLoading || submitting}
              onClick={() => handleGoogleSignUp()}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all text-sm font-bold text-slate-700 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <GoogleIcon />
              <span>{googleLoading ? 'Creating account...' : 'Sign up with Google'}</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center my-5">
            <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              or register manually
            </span>
            <div className="w-full border-t border-slate-200" />
          </div>
          
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
              {Boolean(form.referral_code) && (
                <button
                  type="button"
                  onClick={handleOpenInApp}
                  className="mt-2.5 w-full py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-98 transition-all cursor-pointer"
                >
                  <Smartphone size={14} className="text-emerald-400" />
                  <span>Have Mobile App? Open with Code in App &rarr;</span>
                </button>
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
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleAcceptReferral}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 text-white font-black text-base hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 cursor-pointer"
                >
                  ✅ Continue on Web
                </button>
                <button
                  type="button"
                  onClick={handleOpenInApp}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Smartphone size={18} className="text-emerald-400" />
                  <span>Open in Mobile App</span>
                </button>
                <button
                  type="button"
                  onClick={handleRejectReferral}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all hover:text-slate-900 text-xs cursor-pointer"
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

export default CustomerSignupPage;
