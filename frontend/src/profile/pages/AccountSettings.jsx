import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useCart } from '../../cart-context';

export default function AccountSettings() {
  const { user, syncUser } = useCart();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    username: user?.username || '',
    password: '',
    dob: user?.customer_profile?.dob || '',
  });
  const [loading, setLoading] = useState(false);

  const saveProfile = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('first_name', form.first_name);
      formData.append('username', form.username);
      if (form.password) formData.append('password', form.password);
      
      const customerProfileData = { dob: form.dob };
      formData.append('customer_profile', JSON.stringify(customerProfileData));

      const { data } = await api.put('/auth/profile/', formData);
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(data));
      syncUser();
      toast.success('Profile updated successfully!');
      setForm(prev => ({ ...prev, password: '' }));
    } catch (err) {
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  
  const [deleteLoading, setDeleteLoading] = useState(false);
  const deleteRequested = user?.customer_profile?.delete_requested || false;

  const requestDeletion = async () => {
    if (!window.confirm('Are you sure you want to request account deletion? This action cannot be undone once approved by the owner.')) return;
    setDeleteLoading(true);
    try {
      await api.post('/auth/request-delete/');
      toast.success('Account deletion requested successfully.');
      
      // Update local storage user object
      const updatedUser = { ...user, customer_profile: { ...user.customer_profile, delete_requested: true } };
      localStorage.setItem('smart-kirana-customer-user', JSON.stringify(updatedUser));
      syncUser();
    } catch (err) {
      toast.error('Failed to request deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const submit = (e) => { e.preventDefault(); saveProfile(); };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Account Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and security preferences.</p>
      </div>
      
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Personal Information Section */}
        <div className="p-6 md:p-8">
          <h3 className="text-base font-bold text-slate-900 mb-5 pb-2 border-b border-slate-100">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Full Name</label>
              <input required value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
              <input required type="email" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"/>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">Date of Birth</label>
              <input type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} className="w-full md:w-1/2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"/>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-5 pb-2 border-b border-slate-200">Security</h3>
          <div className="max-w-md">
            <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
            <input type="password" placeholder="Leave blank to keep current password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm"/>
            <p className="text-xs text-slate-500 mt-2 font-medium">Use 8 or more characters with a mix of letters, numbers & symbols.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 md:p-8 border-t border-slate-200 flex justify-end bg-white">
          <button disabled={loading} className="w-full md:w-auto min-w-[140px] bg-primary-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

        {/* Danger Zone */}
        <div className="mt-8 bg-red-50 rounded-2xl shadow-sm border border-red-200 overflow-hidden p-6 md:p-8">
          <h3 className="text-base font-bold text-red-900 mb-2">Danger Zone</h3>
          <p className="text-sm text-red-700 mb-5">Permanently remove your account and all of your data.</p>
          
          {deleteRequested ? (
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg text-sm font-bold border border-orange-200">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
              Deletion Pending Approval
            </div>
          ) : (
            <button 
              type="button" 
              onClick={requestDeletion}
              disabled={deleteLoading}
              className="bg-white text-red-600 border-2 border-red-200 hover:border-red-600 hover:bg-red-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50"
            >
              {deleteLoading ? 'Processing...' : 'Request Account Deletion'}
            </button>
          )}
        </div>
    </div>
  );
}
