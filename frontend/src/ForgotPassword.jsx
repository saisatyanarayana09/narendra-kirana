import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import api from './services/api';
import { ArrowLeft, Mail, ExternalLink, CheckCircle2, KeyRound, Link2 } from 'lucide-react';

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
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [method, setMethod] = useState('otp'); // 'otp' | 'link'
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await api.post('/auth/password-reset/', { 
        email: email.trim(),
        method,
        portal: 'customer'
      });
      const msg = typeof res.data === 'string' ? res.data : (res.data?.message || 'Password reset instructions have been sent.');
      setStatus('success');
      setMessage(String(msg));

      // If user chose OTP, redirect to OTP entry screen after 1.5s
      if (method === 'otp') {
        setTimeout(() => {
          navigate(`/reset-password?email=${encodeURIComponent(email.trim())}&mode=otp`);
        }, 1500);
      }
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
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <Mail size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Reset Password</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600 mb-6">
            Choose your recovery method and enter your email address.
          </p>

          {status === 'success' ? (
            <div className="space-y-4 pt-2">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {method === 'otp' ? 'OTP Code Sent!' : 'Reset Link Sent!'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-0.5">{message}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-semibold">
                    {method === 'otp' 
                      ? '⏱ Code expires in 15 minutes. Redirecting to verification screen...' 
                      : '⏱ Link expires in 15 minutes. Check your inbox or spam folder.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {method === 'otp' ? (
                  <Link
                    to={`/reset-password?email=${encodeURIComponent(email)}&mode=otp`}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98]"
                  >
                    <KeyRound size={16} />
                    <span>Enter 6-Digit OTP Code Now →</span>
                  </Link>
                ) : (
                  <a
                    href={getEmailProviderUrl(email)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-600/20"
                  >
                    <ExternalLink size={16} />
                    <span>Open {getEmailProviderName(email)}</span>
                  </a>
                )}

                <Link
                  to="/login"
                  className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm transition-all"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={submit}>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {message}
                </div>
              )}

              {/* Recovery Method Selection */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Recovery Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('otp')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                      method === 'otp'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${method === 'otp' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <KeyRound size={16} />
                      </div>
                      <span className={`text-xs font-extrabold ${method === 'otp' ? 'text-indigo-900' : 'text-slate-700'}`}>
                        6-Digit OTP
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      Instant code to reset here in browser
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod('link')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                      method === 'link'
                        ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${method === 'link' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        <Link2 size={16} />
                      </div>
                      <span className={`text-xs font-extrabold ${method === 'link' ? 'text-indigo-900' : 'text-slate-700'}`}>
                        Reset Link
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 leading-tight">
                      1-click recovery button sent to email
                    </span>
                  </button>
                </div>
              </div>

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
                type="submit"
                disabled={status === 'loading'}
                className="mt-6 w-full py-3 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-600/20"
              >
                {status === 'loading' ? 'Sending...' : (method === 'otp' ? 'Send 6-Digit OTP Code' : 'Send Reset Link')}
              </button>
            </form>
          )}
        </div>
      </main>
    </CustomerLayout>
  );
}
