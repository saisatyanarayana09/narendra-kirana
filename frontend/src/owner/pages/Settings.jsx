import { useState, useEffect } from 'react';
import { Store, Settings as SettingsIcon, Save, FileText, Truck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import HomepageSectionEditor from '../components/HomepageSectionEditor';

const Settings = () => {
  const [settings, setSettings] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    is_open: true,
    min_order_amount: '0.00',
    packaging_fee: '0.00',
    low_stock_threshold: 5,
    delivery_mode: 'PICKUP',
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    auto_accept_orders: false,
    invoice_signature: null,
    // Homepage section visibility + titles
    show_popular_picks: true,
    popular_picks_title: 'Popular picks',
    show_great_deals: true,
    great_deals_title: 'Great Deals',
    show_new_arrivals: true,
    new_arrivals_title: 'New Arrivals',
    gemini_api_key: '',
    gemini_vision_model: 'gemini-1.5-flash',
    groq_api_key: '',
    groq_text_model: 'llama3-8b-8192',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Crop states
  const [signatureFile, setSignatureFile] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/store/settings/', { params: { t: Date.now() } });
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (err) {
      console.error(err);
      alert('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();

      // Append standard fields
      Object.keys(settings).forEach(key => {
        if (key === 'invoice_signature') return; // handle file separately
        let value = settings[key];

        // Sanitize numerics
        if (['min_order_amount', 'packaging_fee', 'delivery_fee', 'free_delivery_threshold'].includes(key)) {
          if (!value || value === '') value = '0.00';
        }
        if (key === 'low_stock_threshold' && (!value || value === '')) value = 0;

        formData.append(key, value);
      });

      // Append signature file if selected
      if (signatureFile) {
        formData.append('invoice_signature', signatureFile);
      }

      const savePromise = api.patch('/store/settings/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.promise(savePromise, {
        loading: signatureFile ? 'Uploading...' : 'Saving...',
        success: 'Settings saved successfully!',
        error: 'Failed to save settings.'
      });

      await savePromise;

      setSignatureFile(null);
      fetchSettings();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your global store operations and rules.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Store Identity & Operations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900">Store Identity & Operations</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input type="text" name="store_name" value={settings.store_name} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_open" checked={settings.is_open} onChange={handleChange} className="sr-only peer"/>
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
              <div>
                <span className="text-sm font-bold text-gray-900">Store is Open</span>
                <p className="text-xs text-gray-500">Turn this off to prevent customers from placing new orders (e.g., during holidays or emergencies).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Constraints & Fees */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900">Order Constraints & Fees</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order Amount (₹)</label>
              <input type="number" step="0.01" name="min_order_amount" value={settings.min_order_amount} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
              <p className="text-xs text-gray-500 mt-1">Customers cannot checkout if their subtotal is below this.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flat Packaging Fee (₹)</label>
              <input type="number" step="0.01" name="packaging_fee" value={settings.packaging_fee} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
              <p className="text-xs text-gray-500 mt-1">Added to every order automatically at checkout.</p>
            </div>
          </div>
        </div>

        {/* Delivery Rules */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Truck className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900">Delivery Rules</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Allowed Delivery Modes</label>
              <select name="delivery_mode" value={settings.delivery_mode} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="PICKUP">Store Pickup Only</option>
                <option value="DELIVERY">Delivery Only</option>
                <option value="BOTH">Both Pickup & Delivery</option>
              </select>
            </div>
            {(settings.delivery_mode === 'DELIVERY' || settings.delivery_mode === 'BOTH') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Standard Delivery Fee (₹)</label>
                  <input type="number" step="0.01" name="delivery_fee" value={settings.delivery_fee} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Free Delivery Threshold (₹)</label>
                  <input type="number" step="0.01" name="free_delivery_threshold" value={settings.free_delivery_threshold} onChange={handleChange} required className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <p className="text-xs text-gray-500 mt-1">Waive delivery fee if order is above this amount.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory & Automation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900">Inventory & Automation</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert Threshold</label>
              <input type="number" name="low_stock_threshold" value={settings.low_stock_threshold} onChange={handleChange} required className="w-full md:w-1/3 rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"/>
              <p className="text-xs text-gray-500 mt-1">Products with stock at or below this number will be highlighted.</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="auto_accept_orders" checked={settings.auto_accept_orders} onChange={handleChange} className="sr-only peer"/>
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div>
                <span className="text-sm font-bold text-gray-900">Auto-Accept New Orders</span>
                <p className="text-xs text-gray-500">Automatically move orders from 'NEW' to 'ACCEPTED' state immediately upon placement.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900">Invoice Management</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Store Address on Invoice</label>
                <textarea name="store_address" value={settings.store_address} onChange={handleChange} rows="2" className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 123 Market Street, City Center"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number on Invoice</label>
                <input type="text" name="store_phone" value={settings.store_phone} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. +91 98765 43210"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Support Email on Invoice</label>
                <input type="email" name="store_email" value={settings.store_email} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. support@narendrakirana.in"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Digital Signature</label>
              <ImageCropper
                aspect={2.5 / 1}
                currentImageUrl={settings.invoice_signature}
                label="Upload Signature"
                onCropComplete={(file) => setSignatureFile(file)}
              />
              <p className="text-xs text-gray-500 mt-2">White or transparent background recommended.</p>
            </div>
          </div>
        </div>

        {/* AI Management Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <span className="font-bold text-xl">✨</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">AI Management (API Keys)</h2>
              <p className="text-sm text-slate-500">Configure your API keys and models for automated product extraction. Leaving a key blank defaults to the server environment variable.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Google Gemini API Key (Vision)</label>
              <input 
                type="password" 
                name="gemini_api_key" 
                value={settings.gemini_api_key || ''} 
                onChange={handleChange} 
                placeholder="Leave blank to use server default"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Gemini Vision Model</label>
              <select name="gemini_vision_model" value={settings.gemini_vision_model || 'gemini-1.5-flash'} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all">
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Free)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Accuracy)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Groq API Key (Text Generation)</label>
              <input 
                type="password" 
                name="groq_api_key" 
                value={settings.groq_api_key || ''} 
                onChange={handleChange} 
                placeholder="Leave blank to use server default"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Groq Text Model</label>
              <select name="groq_text_model" value={settings.groq_text_model || 'llama3-8b-8192'} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all">
                <option value="llama3-8b-8192">LLaMA 3 8B (Fast)</option>
                <option value="llama3-70b-8192">LLaMA 3 70B (High Quality)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                <option value="gemma2-9b-it">Gemma 2 9B</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm disabled:bg-indigo-400">
            <Save className="w-5 h-5"/>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
