import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import api from './services/api';
import { ArrowLeft, Mail, ExternalLink, CheckCircle2 } from 'lucide-react';

function getEmailProviderUrl(emailStr) {
  if (!emailStr) return 'https://mail.google.com';
  const domain = emailStr.split('@')[1]?.toLowerCase() || '';
  if (domain.includes('gmail') || domain.includes('googlemail')) return 'https://mail.google.com';
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn')) return 'https://outlook.live.com';
  if (domain.includes('yahoo') || domain.includes('ymail')) return 'https://mail.yahoo.com';
  if (domain.includes('icloud')) return 'https://www.icloud.com/mail';
  return `mailto:${emailStr}`;
}

function getEmailProviderName(emailStr) {
  if (!emailStr) return 'Email App';
  const domain = emailStr.split('@')[1]?.toLowerCase() || '';
  if (domain.includes('gmail')) return 'Gmail';
  if (domain.includes('outlook') || domain.includes('hotmail')) return 'Outlook';
  if (domain.includes('yahoo')) return 'Yahoo Mail';
  if (domain.includes('icloud')) return 'iCloud Mail';
  return 'Email App';
}

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await api.post('/auth/password-reset/', { email });
      const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'If an account exists, a reset link has been sent.');
      setStatus('success');
      setMessage(String(msg));
    } catch (err) {
      setStatus('error');
      const errData = err.response?.data;
      const errMsg = typeof errData === 'string' ? errData : (errData?.error || errData?.detail || errData?.message || '');
      setMessage(String(errMsg || (err.response ? 'Server (' + err.response.status + ')' : 'Network Error') || 'Something went wrong.'));
    }
  }

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-10">
        <button onClick={() => window.history.back()} className="mb-4 flex items-center gap-2 text-sm font-bold text-primary-700 hover:underline">
          <ArrowLeft size={16} /> Back
        </button>
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <Mail size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Reset Password</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600 mb-6">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          {status === 'success' ? (
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Check your email</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{message}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
                    We've sent a 1-click reset button AND a 6-digit OTP code (expires in 10 minutes).
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email)}&mode=otp`}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                >
                  <span>Enter 6-Digit OTP Code →</span>
                </Link>

                <a
                  href={getEmailProviderUrl(email)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-bold transition-all text-sm"
                >
                  <ExternalLink size={16} />
                  <span>Open {getEmailProviderName(email)}</span>
                </a>

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {message}
                </div>
              )}
              <label className="block text-sm font-bold text-slate-700">
                Email address
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </label>
              <button
                disabled={status === 'loading'}
                className="mt-6 w-full py-3 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
              >
                {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
              </button>
            </>
          )}
        </form>
      </main>
    </CustomerLayout>
  );
}
