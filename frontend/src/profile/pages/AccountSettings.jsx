import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../../cart-context';

export default function AccountSettings() {
  const { user, syncUser } = useCart();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    password: '',
    confirmPassword: '',
    dob: user?.customer_profile?.dob || '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    if (form.password) {
      if (form.password.length < 6) {
        toast.error('Password must be at least 6 characters long.');
        return;
      }
      if (!form.confirmPassword) {
        toast.error('Please confirm your new password.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        toast.error('New password and confirm password do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name);
      if (form.password) formData.append('password', form.password);
      
      const customerProfileData = { dob: form.dob };
      formData.append('customer_profile', JSON.stringify(customerProfileData));

      const { data } = await api.put('/auth/profile/', formData);
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data));
      syncUser();
      toast.success('Profile updated successfully!');
      setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const deleteRequested = user?.customer_profile?.delete_requested || false;

  const requestDeletion = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password to confirm.');
      return;
    }
    setDeleteLoading(true);
    try {
      await api.post('/auth/request-delete/', { password: deletePassword });
      toast.success('Account deletion requested successfully.');
      
      // Update local storage user object
      const updatedUser = { ...user, customer_profile: { ...user.customer_profile, delete_requested: true } };
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(updatedUser));
      syncUser();
      setShowDeletePrompt(false);
      setDeletePassword('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to request deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const submit = (e) => { e.preventDefault(); saveProfile(); };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your personal information and security preferences.</p>
      </div>
      
      <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Personal Information Section */}
        <div className="p-6 md:p-8">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 pb-2 border-b border-slate-100 dark:border-slate-800">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
              <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Cannot be changed</span>
              </div>
              <input 
                disabled 
                readOnly 
                type="email" 
                value={user?.email || user?.username || ''} 
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 p-3.5 text-sm font-medium text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none shadow-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="w-full md:w-1/2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"/>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5 pb-2 border-b border-slate-200 dark:border-slate-700">Security & Password</h3>
          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
              <div className="relative w-full">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Leave blank to keep current password" 
                  value={form.password} 
                  onChange={e => setForm({...form, password: e.target.value})} 
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {form.password ? (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                <div className="relative w-full">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Re-enter new password" 
                    value={form.confirmPassword} 
                    onChange={e => setForm({...form, confirmPassword: e.target.value})} 
                    className={`w-full rounded-xl border p-3.5 pr-10 text-sm font-medium outline-none transition-all shadow-sm focus:ring-2 ${
                      form.confirmPassword && form.password !== form.confirmPassword 
                        ? 'border-red-300 dark:border-red-500 bg-red-50/30 dark:bg-red-950/30 focus:ring-red-400' 
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-primary-500'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 font-medium">Passwords do not match</p>
                )}
              </div>
            ) : null}

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Use 8 or more characters with a mix of letters, numbers & symbols.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 md:p-8 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-900">
          <button disabled={loading} className="w-full md:w-auto min-w-[140px] bg-primary-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

        {/* Danger Zone */}
        <div className="mt-8 bg-red-50 dark:bg-rose-950/20 rounded-2xl shadow-sm border border-red-200 dark:border-rose-900/50 overflow-hidden p-6 md:p-8">
          <h3 className="text-base font-bold text-red-900 dark:text-rose-200 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 dark:text-rose-300 mb-5">Permanently remove your account and all of your data.</p>
          
          {deleteRequested ? (
            <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-amber-950/60 text-orange-800 dark:text-amber-300 px-4 py-2 rounded-lg text-sm font-bold border border-orange-200 dark:border-amber-800">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Deletion Pending Approval
            </div>
          ) : showDeletePrompt ? (
            <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-rose-900/60 p-4 rounded-xl flex flex-col gap-3 items-start w-full md:w-1/2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Enter your password to confirm</label>
              <div className="relative w-full">
              <input 
                type={showDeletePassword ? "text" : "password"} 
                value={deletePassword} 
                onChange={e => setDeletePassword(e.target.value)} 
                placeholder="Your password" 
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-2.5 pr-10 text-sm font-medium focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-red-500 outline-none"
              />
              <button type="button" onClick={() => setShowDeletePassword(!showDeletePassword)} className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300">
                {showDeletePassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              </div>
              <div className="flex gap-2 w-full mt-1">
                <button 
                  type="button" 
                  onClick={requestDeletion}
                  disabled={deleteLoading}
                  className="bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex-1 disabled:opacity-50"
                >
                  {deleteLoading ? 'Processing...' : 'Confirm Deletion'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { setShowDeletePrompt(false); setDeletePassword(''); }}
                  disabled={deleteLoading}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-colors flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={() => setShowDeletePrompt(true)}
              className="bg-white dark:bg-slate-900 text-red-600 dark:text-rose-400 border-2 border-red-200 dark:border-rose-900/60 hover:border-red-600 hover:bg-red-50 dark:hover:bg-rose-950/40 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
            >
              Request Account Deletion
            </button>
          )}
        </div>
    </div>
  );
}
