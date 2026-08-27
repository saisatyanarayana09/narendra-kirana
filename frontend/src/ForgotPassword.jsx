import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import api from './services/api';
import { ArrowLeft, Mail } from 'lucide-react';

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
      setStatus('success');
      setMessage(res.data.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || (err.response ? 'Server (' + err.response.status + ')' : 'Network Error to ' + api.defaults.baseURL) || 'Failed');
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
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 font-medium">
              {message}
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
