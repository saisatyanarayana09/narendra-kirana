import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { Eye, EyeOff, Loader2, Store } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: localStorage.getItem('smart-kirana-owner-username') || '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login/', form);
      if (!data.user.is_owner) throw new Error('This account does not have owner access.');
      
      localStorage.setItem('smart-kirana-owner-token', data.access);
      localStorage.setItem('smart-kirana-owner-refresh', data.refresh);
      localStorage.setItem('smart-kirana-owner-user', JSON.stringify(data.user));
      localStorage.setItem('smart-kirana-owner-username', form.username);
      
      const from = location.state?.from?.pathname || '/owner/welcome';
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || requestError.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/google-login/', { credential: credentialResponse.credential });
      
      localStorage.setItem('smart-kirana-owner-token', data.access);
      localStorage.setItem('smart-kirana-owner-refresh', data.refresh);
      localStorage.setItem('smart-kirana-owner-user', JSON.stringify(data.user));
      
      const from = location.state?.from?.pathname || '/owner/welcome';
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Unable to sign in with Google.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dummy-client-id'}>
      <main className="min-h-screen flex bg-white">
        {/* Left Side: Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-10 lg:text-left">
              <p className="text-sm font-black tracking-[0.2em] uppercase drop-shadow-sm mb-3 flex items-center justify-center lg:justify-start gap-2">
                <div className="p-1.5 bg-indigo-50 rounded-md">
                  <Store className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-emerald-900">NARENDRA</span> <span className="text-indigo-600">KIRANA</span>
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Owner Portal</h1>
              <p className="text-base text-slate-500 mt-2 font-medium">Welcome back. Please sign in to manage your store.</p>
            </div>
            
            {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 text-sm font-bold text-red-700 border border-red-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
            )}
            
            <form onSubmit={submit} className="space-y-6">
              <div className="flex justify-center lg:justify-start">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Sign-In failed or was cancelled.')}
                  useOneTap
                />
              </div>

              <div className="relative flex items-center justify-center mb-6">
                <span className="absolute bg-white px-3 text-[11px] font-black uppercase tracking-widest text-slate-400">or sign in with email</span>
                <div className="w-full border-t border-slate-200"></div>
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor="username" className="block text-sm font-bold text-slate-700 mb-1.5">Username</label>
                  <input 
                    id="username"
                    autoFocus
                    required 
                    type="text"
                    value={form.username} 
                    onChange={(e) => setForm({ ...form, username: e.target.value })} 
                    className={`w-full rounded-xl border px-4 py-3.5 bg-slate-50 outline-none focus:bg-white focus:ring-2 transition-all shadow-sm ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-bold text-slate-700">Password</label>
                    <Link to="/forgot-password" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input 
                      id="password"
                      required 
                      type={showPassword ? "text" : "password"}
                      value={form.password} 
                      onChange={(e) => setForm({ ...form, password: e.target.value })} 
                      className={`w-full rounded-xl border px-4 py-3.5 bg-slate-50 pr-12 outline-none focus:bg-white focus:ring-2 transition-all shadow-sm ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:ring-indigo-500 focus:border-indigo-500'}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 focus:outline-none rounded-lg hover:bg-slate-200 transition-colors"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <button 
                disabled={submitting} 
                className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-bold text-white hover:bg-indigo-700 transition-all shadow-[0_4px_14px_0_rgb(79,70,229,0.39)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.23)] hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:shadow-none disabled:transform-none flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                ) : (
                  'Sign in to Dashboard'
                )}
              </button>
            </form>
          </div>
        </div>
        
        {/* Right Side: Image */}
        <div className="hidden lg:block lg:flex-1 relative overflow-hidden bg-slate-900">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 to-slate-900/80 z-10 mix-blend-multiply" />
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1920" 
            alt="Grocery store layout" 
            className="absolute inset-0 w-full h-full object-cover scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent z-10" />
          
          <div className="absolute bottom-0 left-0 p-16 z-20 w-full max-w-2xl">
            <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
              Manage your store <br/>effortlessly.
            </h2>
            <p className="text-indigo-100/80 text-lg leading-relaxed font-medium max-w-lg">
              Track orders in real-time, monitor your inventory, and grow your sales with powerful AI insights—all from one unified dashboard.
            </p>
          </div>
        </div>
      </main>
    </GoogleOAuthProvider>
  );
};

export default OwnerLogin;
