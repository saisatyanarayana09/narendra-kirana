import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const OwnerLogin = () => {
 const navigate = useNavigate();
 const [form, setForm] = useState({ username: '', password: '' });
 const [error, setError] = useState('');
 const [submitting, setSubmitting] = useState(false);

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
 navigate('/owner/welcome');
 } catch (requestError) {
 setError(requestError.response?.data?.detail || requestError.message || 'Unable to sign in.');
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <main className="grid min-h-screen place-items-center bg-gray-50 p-4">
 <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
 <div className="text-center mb-8">
 <p className="text-sm font-black tracking-[0.2em] uppercase drop-shadow-sm mb-1">
 <span className="text-emerald-900">NARENDRA</span> <span className="text-primary-600">KIRANA</span>
 </p>
 <h1 className="text-2xl font-bold text-gray-900">Owner Portal</h1>
 <p className="text-sm text-gray-500 mt-2">Sign in to manage your store.</p>
 </div>
 
 {error && (
 <div className="mb-6 p-4 rounded-xl bg-red-50 text-sm text-red-700 border border-red-100">
 {error}
 </div>
 )}

 <div className="space-y-4">
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
 <input 
 required 
 type="text"
 value={form.username} 
 onChange={(e) => setForm({ ...form, username: e.target.value })} 
 className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
 <input 
 required 
 type="password"
 value={form.password} 
 onChange={(e) => setForm({ ...form, password: e.target.value })} 
 className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
 />
 </div>
 </div>

 <button 
 disabled={submitting} 
 className="mt-8 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 transition disabled:opacity-60"
 >
 {submitting ? 'Signing in...' : 'Sign in'}
 </button>
 </form>
 </main>
 );
};

export default OwnerLogin;
