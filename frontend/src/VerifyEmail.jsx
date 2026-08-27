import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CustomerLayout } from './customer-layout';
import api from './services/api';
import { CheckCircle, XCircle } from 'lucide-react';

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
    <CustomerLayout>
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center">
          {status === 'verifying' && (
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
          )}
          {status === 'success' && (
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-6" />
          )}
          {status === 'error' && (
            <XCircle className="w-16 h-16 text-red-500 mb-6" />
          )}
          
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
            {status === 'verifying' ? 'Verifying...' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
          </h1>
          <p className="text-slate-600 mb-8">{message}</p>

          {status === 'success' && (
            <p className="text-sm font-bold text-slate-400">Redirecting to login...</p>
          )}

          {status === 'error' && (
            <Link to="/login" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
              Go to Login
            </Link>
          )}
        </div>
      </main>
    </CustomerLayout>
  );
}
