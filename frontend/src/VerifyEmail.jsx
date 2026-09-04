import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from './services/api';
import { CheckCircle, XCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');

    if (!uid || !token) {
      setStatus('error');
      setMessage('Invalid or missing verification link.');
      return;
    }

    api.post('/auth/verify-email/', { uid, token })
      .then((res) => {
        setStatus('success');
        setMessage(res.data.message || 'Account activated successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed. The link may be expired.');
      });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 flex flex-col justify-between transition-colors duration-200">
      {/* Clean Branded Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0d1322]/90 backdrop-blur-xl sticky top-0 z-30 shadow-xs">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-xl sm:text-2xl font-black tracking-tight hover:opacity-85 transition">
            <span className="text-slate-900 dark:text-white">Narendra</span>
            <span className="text-primary-600 dark:text-primary-400">Kirana</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
          >
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-md px-4 py-12 my-auto text-center">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col items-center">
          {status === 'verifying' && (
            <div className="w-16 h-16 border-4 border-indigo-100 dark:border-indigo-950 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
          )}
          {status === 'success' && (
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-6" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 text-red-500 mb-6" />
          )}
          
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
            {status === 'verifying' ? 'Verifying...' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8 text-sm">{message}</p>

          {status === 'success' && (
            <p className="text-sm font-bold text-slate-400">Redirecting to login...</p>
          )}

          {status === 'error' && (
            <Link to="/login" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-sm shadow-md">
              Go to Login
            </Link>
          )}
        </div>
      </main>

      {/* Clean Security Footer */}
      <footer className="border-t border-slate-200/60 dark:border-slate-800/60 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center justify-center gap-1.5 font-medium">
          <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>256-Bit SSL Encrypted &bull; Narendra Kirana Security</span>
        </div>
      </footer>
    </div>
  );
}
