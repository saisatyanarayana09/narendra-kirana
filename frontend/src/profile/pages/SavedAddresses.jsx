import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Trash2, Plus, X, Edit2, RefreshCw, CheckCircle2 } from 'lucide-react';
import api, { getUserCacheSync, setUserCache } from '../../services/api';
import toast from 'react-hot-toast';

export default function SavedAddresses() {
  const cachedAddresses = getUserCacheSync('/auth/addresses/');
  const [addresses, setAddresses] = useState(cachedAddresses || []);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(!cachedAddresses);
  const [form, setForm] = useState({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });

  const fetchAddresses = () => api.get('/auth/addresses/').then(res => { 
    const addrList = res.data.results || res.data || [];
    setAddresses(addrList); 
    setUserCache('/auth/addresses/', addrList);
    setLoading(false); 
  }).catch(() => setLoading(false));
  useEffect(() => { fetchAddresses(); }, []);

  const captureLocation = () => {
     const loadingToast = toast.loading("Getting your exact location...");
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => {
             setForm({...form, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))});
             toast.success("Location captured successfully!", { id: loadingToast });
         },
         (err) => {
             toast.error("Could not fetch location. Please enable GPS.", { id: loadingToast });
         }
       );
     } else {
       toast.error("Geolocation not supported.", { id: loadingToast });
     }
   };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
         await api.put(`/auth/addresses/${editingId}/`, form);
         toast.success('Address updated.');
      } else {
         await api.post('/auth/addresses/', form);
         toast.success('Address saved.');
      }
      setShowAdd(false);
      setEditingId(null);
      setForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });
      fetchAddresses();
    } catch (err) { 
        toast.error(err.response?.data?.latitude?.[0] || err.response?.data?.detail || 'Could not save address.'); 
    }
  };

  const remove = async (id) => {
    try { await api.delete(`/auth/addresses/${id}/`); fetchAddresses(); toast.success('Address removed.'); } catch (err) {}
  };

  const startEdit = (a) => {
      setForm(a);
      setEditingId(a.id);
      setShowAdd(true);
      window.scrollTo(0, 0);
  };

  return (
    <div>
      <div className="mb-6 border-b border-slate-200 dark:border-slate-800 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Saved Addresses</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage delivery locations for quick checkout.</p>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); if(showAdd) { setEditingId(null); setForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null }); } }} className={`text-sm font-bold flex items-center px-4 py-2 rounded-xl transition-all shadow-sm ${showAdd ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
            {showAdd ? <X size={16} className="mr-1.5"/> : <Plus size={16} className="mr-1.5"/>}
            {showAdd ? 'Cancel' : 'Add New'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 md:p-8 mb-8 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
             <h3 className="text-base font-bold text-slate-900 dark:text-white">{editingId ? 'Edit Address' : 'Address Details'}</h3>
             {!form.latitude ? (
                <button type="button" onClick={captureLocation} className="w-full sm:w-auto font-extrabold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                  <MapPin size={18} className="text-indigo-600 dark:text-indigo-400" />
                  📍 Capture My Exact Location
                </button>
              ) : (
                <div className="w-full sm:w-auto flex items-center justify-between gap-4 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm pl-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>GPS Secured</span>
                  </div>
                  <button type="button" onClick={captureLocation} className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-slate-700 transition-colors shadow-sm active:scale-95">
                    <RefreshCw size={14} /> Relocate
                  </button>
                </div>
              )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Label (e.g. Home, Work)</label>
              <input required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Street Address</label>
              <textarea required value={form.street} onChange={e=>setForm({...form, street:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none h-20"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Landmark</label>
              <input value={form.landmark} onChange={e=>setForm({...form, landmark:e.target.value})} placeholder="Optional" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">City</label>
              <input required value={form.city} onChange={e=>setForm({...form, city:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">District</label>
              <input value={form.district} onChange={e=>setForm({...form, district:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">State</label>
              <input required value={form.state} onChange={e=>setForm({...form, state:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Country</label>
              <input required value={form.country} onChange={e=>setForm({...form, country:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Pincode</label>
              <input required value={form.zip_code} onChange={e=>setForm({...form, zip_code:e.target.value})} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white p-3.5 text-sm focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" className="w-full sm:w-auto bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 transition-all shadow-sm">{editingId ? 'Update Address' : 'Save Address'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-40 bg-slate-50 dark:bg-slate-800/60 animate-pulse rounded-2xl border border-slate-100 dark:border-slate-800"></div>)}
        </div>
      ) : addresses.length === 0 && !showAdd ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-primary-50 dark:bg-primary-950/50 rounded-full flex items-center justify-center text-primary-400 dark:text-primary-300 mb-6 shadow-inner">
            <MapPin size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">No addresses saved</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">Add your home or work address so you can check out faster on your next order.</p>
          <button onClick={() => setShowAdd(true)} className="bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-2">
            <Plus size={18} /> Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {addresses.map(a => (
            <div key={a.id} className="group bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all relative">
              <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => startEdit(a)} className="text-slate-300 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 p-2 rounded-xl transition-colors border border-transparent dark:border-slate-700" title="Edit address">
                    <Edit2 size={16}/>
                  </button>
                  <button onClick={() => remove(a.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/50 p-2 rounded-xl transition-colors border border-transparent dark:border-slate-700" title="Delete address">
                    <Trash2 size={16}/>
                  </button>
              </div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 flex items-center justify-center mr-3">
                  <MapPin size={16} />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{a.title}</h3>
              </div>
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300 space-y-1 pl-11">
                <p>{a.street}</p>
                {a.landmark && <p>Landmark: {a.landmark}</p>}
                <p>{a.city}{a.district ? `, ${a.district}` : ''}</p>
                <p>{a.state}, {a.country} {a.zip_code}</p>
                {a.latitude && <p className="text-xs text-green-600 dark:text-emerald-400 mt-2 font-bold flex items-center gap-1"><MapPin size={12}/> Exact Location Saved</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
