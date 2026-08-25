import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import { api } from './vendor-http';
import { Lock } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  async function submit(e) {
    e.preventDefault();
    if (!uid || !token) {
      setStatus('error');
      setMessage('Invalid or missing reset link.');
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await api.post('/auth/password-reset-confirm/', { 
        uid, 
        token, 
        new_password: password 
      });
      setStatus('success');
      setMessage(res.data.message || 'Password reset successful!');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
    }
  }

  return (
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-10">
        <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
              <Lock size={24} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">Create New Password</h1>
          </div>
          <p className="mt-2 text-sm text-slate-600 mb-6">
            Please enter your new password below.
          </p>

          {status === 'success' ? (
            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 font-medium text-center">
              {message}
              <p className="mt-2 text-sm text-emerald-600">Redirecting to login...</p>
            </div>
          ) : (
            <>
              {status === 'error' && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100">
                  {message}
                </div>
              )}
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">
                  New Password
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Enter new password"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Confirm Password
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border p-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="Confirm new password"
                  />
                </label>
              </div>
              <button
                disabled={status === 'loading'}
                className="mt-6 w-full py-3 rounded-xl bg-indigo-600 font-bold text-white transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50"
              >
                {status === 'loading' ? 'Saving...' : 'Save Password'}
              </button>
            </>
          )}
        </form>
      </main>
    </CustomerLayout>
  );
}
