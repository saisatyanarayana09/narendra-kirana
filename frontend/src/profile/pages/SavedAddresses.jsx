import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, Trash2, Plus, X, Edit2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function SavedAddresses() {
  const [addresses, setAddresses] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null });

  const fetchAddresses = () => api.get('/auth/addresses/').then(res => { setAddresses(res.data.results || res.data); setLoading(false); }).catch(() => setLoading(false));
  useEffect(() => { fetchAddresses(); }, []);

  const captureLocation = () => {
     if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(
         (pos) => setForm({...form, latitude: parseFloat(pos.coords.latitude.toFixed(6)), longitude: parseFloat(pos.coords.longitude.toFixed(6))}),
         (err) => alert("Could not fetch location. Please ensure location services are enabled.")
       );
     } else {
       alert("Geolocation is not supported by your browser.");
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
      <div className="mb-6 border-b border-slate-200 pb-4">
        <Link to="/profile" className="text-sm font-bold text-slate-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1 mb-4">
          <ChevronRight className="rotate-180" size={16}/> Back to Dashboard
        </Link>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Saved Addresses</h2>
            <p className="text-sm text-slate-500 mt-1">Manage delivery locations for quick checkout.</p>
          </div>
          <button onClick={() => { setShowAdd(!showAdd); if(showAdd) { setEditingId(null); setForm({ title: 'Home', street: '', landmark: '', city: '', district: '', state: '', country: 'India', zip_code: '', latitude: null, longitude: null }); } }} className={`text-sm font-bold flex items-center px-4 py-2 rounded-xl transition-all shadow-sm ${showAdd ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
            {showAdd ? <X size={16} className="mr-1.5"/> : <Plus size={16} className="mr-1.5"/>}
            {showAdd ? 'Cancel' : 'Add New'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8 border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 pb-4 border-b border-slate-100 gap-3">
             <h3 className="text-base font-bold text-slate-900">{editingId ? 'Edit Address' : 'Address Details'}</h3>
             <button type="button" onClick={captureLocation} className={`w-full sm:w-auto font-extrabold text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition-all border-2 active:scale-[0.98] ${form.latitude ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}>
                <MapPin size={18} className={form.latitude ? "text-emerald-600" : "text-indigo-600"} />
                {form.latitude ? "✅ Location Saved (Tap to Relocate)" : "📍 Capture My Exact Location"}
              </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Label (e.g. Home, Work)</label>
              <input required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Street Address</label>
              <textarea required value={form.street} onChange={e=>setForm({...form, street:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none h-20"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Landmark</label>
              <input value={form.landmark} onChange={e=>setForm({...form, landmark:e.target.value})} placeholder="Optional" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">City</label>
              <input required value={form.city} onChange={e=>setForm({...form, city:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">District</label>
              <input value={form.district} onChange={e=>setForm({...form, district:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">State</label>
              <input required value={form.state} onChange={e=>setForm({...form, state:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Country</label>
              <input required value={form.country} onChange={e=>setForm({...form, country:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Pincode</label>
              <input required value={form.zip_code} onChange={e=>setForm({...form, zip_code:e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition-all"/>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" className="w-full sm:w-auto bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 transition-all shadow-sm">{editingId ? 'Update Address' : 'Save Address'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2].map(i => <div key={i} className="h-40 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>)}
        </div>
      ) : addresses.length === 0 && !showAdd ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center text-primary-300 mb-6 shadow-inner">
            <MapPin size={48} strokeWidth={1.5} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No addresses saved</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">Add your home or work address so you can check out faster on your next order.</p>
          <button onClick={() => setShowAdd(true)} className="bg-primary-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-primary-700 hover:shadow-md active:scale-95 transition-all inline-flex items-center gap-2">
            <Plus size={18} /> Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {addresses.map(a => (
            <div key={a.id} className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all relative">
              <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => startEdit(a)} className="text-slate-300 hover:text-indigo-600 bg-white hover:bg-indigo-50 p-2 rounded-xl transition-colors" title="Edit address">
                    <Edit2 size={16}/>
                  </button>
                  <button onClick={() => remove(a.id)} className="text-slate-300 hover:text-red-500 bg-white hover:bg-red-50 p-2 rounded-xl transition-colors" title="Delete address">
                    <Trash2 size={16}/>
                  </button>
              </div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center mr-3">
                  <MapPin size={16} />
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg">{a.title}</h3>
              </div>
              <div className="text-sm font-medium text-slate-600 space-y-1 pl-11">
                <p>{a.street}</p>
                {a.landmark && <p>Landmark: {a.landmark}</p>}
                <p>{a.city}{a.district ? `, ${a.district}` : ''}</p>
                <p>{a.state}, {a.country} {a.zip_code}</p>
                {a.latitude && <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><MapPin size={12}/> Exact Location Saved</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
