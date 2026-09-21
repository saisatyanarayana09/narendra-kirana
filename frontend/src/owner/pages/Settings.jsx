import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, 
  Settings as SettingsIcon, 
  Save, 
  FileText, 
  Truck, 
  AlertTriangle,
  Mail,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  SlidersHorizontal,
  ArrowRight,
  Copy,
  Check,
  Download,
  Database
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';
import StoreRadiusMapPicker from '../components/StoreRadiusMapPicker';

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
    is_home_delivery_active: false,
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    min_delivery_order_amount: '150.00',
    allowed_pincodes: '',
    store_latitude: 17.385044,
    store_longitude: 78.486671,
    delivery_radius_km: 5.00,
    enforce_delivery_radius: false,
    auto_accept_orders: false,
    invoice_signature: null,
    // Homepage section visibility + titles
    show_popular_picks: true,
    popular_picks_title: 'Popular picks',
    show_great_deals: true,
    great_deals_title: 'Great Deals',
    show_new_arrivals: true,
    new_arrivals_title: 'New Arrivals',
  });

  // Dynamic Email & App Password states
  const [emailSettings, setEmailSettings] = useState({
    provider: 'gmail',
    sender_email: '',
    sender_name: 'Narendra Kirana',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    use_tls: true,
    use_ssl: false,
    is_active: false,
    app_password: '',
    has_password: false,
    last_tested_at: null,
    last_test_status: '',
  });
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  const handleQuickDownloadBackup = async () => {
    setDownloadingBackup(true);
    const toastId = toast.loading('Exporting complete store database...');
    try {
      const response = await api.get('/store/backup/export/', {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/json' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `narendra_kirana_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Complete store backup downloaded!', { id: toastId });
    } catch (err) {
      console.error('Backup download error:', err);
      toast.error('Failed to export backup. Please try again.', { id: toastId });
    } finally {
      setDownloadingBackup(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Crop states
  const [signatureFile, setSignatureFile] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchEmailSettings();
  }, []);

  const fetchEmailSettings = async () => {
    try {
      const response = await api.get('/store/email-settings/', { params: { t: Date.now() } });
      if (response.data) {
        setEmailSettings(prev => ({
          ...prev,
          ...response.data,
          sender_email: response.data.sender_email || prev.sender_email || '',
          app_password: response.data.app_password || '',
        }));
        if (response.data.sender_email && !testRecipient) {
          setTestRecipient(response.data.sender_email);
        }
      }
    } catch (err) {
      console.error('Failed to load email settings:', err);
    }
  };

  const handleSelectProvider = (provider) => {
    if (provider === 'gmail') {
      setEmailSettings(prev => ({
        ...prev,
        provider: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        use_tls: true,
        use_ssl: false,
      }));
    } else if (provider === 'outlook') {
      setEmailSettings(prev => ({
        ...prev,
        provider: 'outlook',
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        use_tls: true,
        use_ssl: false,
      }));
    } else {
      setEmailSettings(prev => ({
        ...prev,
        provider: 'custom',
      }));
    }
  };

  const handleSaveEmailSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingEmail(true);
    try {
      const payload = {
        provider: emailSettings.provider,
        sender_email: emailSettings.sender_email ? emailSettings.sender_email.trim() : '',
        sender_name: emailSettings.sender_name ? emailSettings.sender_name.trim() : 'Narendra Kirana',
        smtp_host: emailSettings.smtp_host ? emailSettings.smtp_host.trim() : 'smtp.gmail.com',
        smtp_port: Number(emailSettings.smtp_port) || 587,
        use_tls: Boolean(emailSettings.use_tls),
        use_ssl: Boolean(emailSettings.use_ssl),
        is_active: Boolean(emailSettings.is_active),
      };
      if (emailSettings.app_password !== undefined) {
        payload.app_password = emailSettings.app_password.trim();
      }

      const res = await api.patch('/store/email-settings/', payload);
      setEmailSettings(prev => ({
        ...prev,
        ...res.data,
        app_password: res.data?.app_password ?? payload.app_password ?? prev.app_password,
      }));
      toast.success('Store Email & SMTP credentials saved!');
    } catch (err) {
      console.error(err);
      const errors = err.response?.data;
      let errMsg = 'Failed to save email settings.';
      if (errors && typeof errors === 'object') {
        const firstKey = Object.keys(errors)[0];
        const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
        if (firstVal && typeof firstVal === 'string') {
          errMsg = `${firstKey.replace(/_/g, ' ')}: ${firstVal}`;
        }
      } else if (errors?.detail || errors?.error) {
        errMsg = errors.detail || errors.error;
      }
      toast.error(errMsg);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTest = async (e) => {
    if (e) e.preventDefault();
    if (!testRecipient || !testRecipient.includes('@')) {
      toast.error('Please enter a valid recipient email address.');
      return;
    }
    setTestingEmail(true);
    try {
      const payload = {
        test_email: testRecipient.trim(),
        config_override: {
          provider: emailSettings.provider,
          sender_email: emailSettings.sender_email ? emailSettings.sender_email.trim() : '',
          sender_name: emailSettings.sender_name ? emailSettings.sender_name.trim() : 'Narendra Kirana',
          smtp_host: emailSettings.smtp_host ? emailSettings.smtp_host.trim() : 'smtp.gmail.com',
          smtp_port: Number(emailSettings.smtp_port) || 587,
          use_tls: Boolean(emailSettings.use_tls),
          use_ssl: Boolean(emailSettings.use_ssl),
          app_password: emailSettings.app_password ? emailSettings.app_password.trim() : undefined,
        }
      };
      const res = await api.post('/store/email-settings/test/', payload);
      toast.success(res.data.message || 'Test email delivered successfully!');
      fetchEmailSettings();
      setTestModalOpen(false);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || err.message || 'Test email failed.';
      toast.error(errMsg, { duration: 6500 });
    } finally {
      setTestingEmail(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/store/settings/', { params: { t: Date.now() } });
      setSettings(prev => ({ ...prev, ...response.data }));
      if (response.data?.store_email) {
        setEmailSettings(prev => ({
          ...prev,
          sender_email: prev.sender_email || response.data.store_email,
        }));
        setTestRecipient(prev => prev || response.data.store_email);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load settings.');
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
      const payload = {
        store_name: settings.store_name?.trim() || 'Narendra Kirana',
        store_address: settings.store_address?.trim() || '',
        store_phone: (settings.store_phone?.trim() || '').slice(0, 20),
        store_email: settings.store_email?.trim() || '',
        is_open: Boolean(settings.is_open),
        min_order_amount: (parseFloat(settings.min_order_amount) || 0).toFixed(2),
        packaging_fee: (parseFloat(settings.packaging_fee) || 0).toFixed(2),
        low_stock_threshold: parseInt(settings.low_stock_threshold, 10) || 0,
        is_home_delivery_active: Boolean(settings.is_home_delivery_active),
        delivery_mode: settings.is_home_delivery_active ? 'BOTH' : 'PICKUP',
        delivery_fee: (parseFloat(settings.delivery_fee) || 0).toFixed(2),
        free_delivery_threshold: (parseFloat(settings.free_delivery_threshold) || 0).toFixed(2),
        min_delivery_order_amount: (parseFloat(settings.min_delivery_order_amount) || 0).toFixed(2),
        allowed_pincodes: settings.allowed_pincodes ? settings.allowed_pincodes.trim() : '',
        store_latitude: settings.store_latitude ? parseFloat(settings.store_latitude).toFixed(6) : '17.385044',
        store_longitude: settings.store_longitude ? parseFloat(settings.store_longitude).toFixed(6) : '78.486671',
        delivery_radius_km: settings.delivery_radius_km ? parseFloat(settings.delivery_radius_km).toFixed(2) : '5.00',
        enforce_delivery_radius: Boolean(settings.enforce_delivery_radius),
        auto_accept_orders: Boolean(settings.auto_accept_orders),
        show_popular_picks: Boolean(settings.show_popular_picks),
        popular_picks_title: settings.popular_picks_title?.trim() || 'Popular picks',
        show_great_deals: Boolean(settings.show_great_deals),
        great_deals_title: settings.great_deals_title?.trim() || 'Great Deals',
        show_new_arrivals: Boolean(settings.show_new_arrivals),
        new_arrivals_title: settings.new_arrivals_title?.trim() || 'New Arrivals',
      };

      let savePromise;
      if (signatureFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, val]) => {
          formData.append(key, val);
        });
        formData.append('invoice_signature', signatureFile);
        savePromise = api.patch('/store/settings/', formData);
      } else {
        savePromise = api.patch('/store/settings/', payload);
      }

      toast.promise(savePromise, {
        loading: signatureFile ? 'Uploading signature & saving...' : 'Saving settings...',
        success: 'Settings saved successfully!',
        error: (err) => {
          const errors = err.response?.data;
          if (errors && typeof errors === 'object') {
            const firstKey = Object.keys(errors)[0];
            const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
            if (firstVal && typeof firstVal === 'string') {
              return `${firstKey.replace(/_/g, ' ')}: ${firstVal}`;
            }
          }
          return err.response?.data?.detail || err.response?.data?.error || err.message || 'Failed to save settings.';
        }
      });

      await savePromise;
      setSignatureFile(null);
      fetchSettings();
    } catch (err) {
      console.error('Settings save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-medium">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Advanced Settings Quick Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Store Settings</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Configure your core store operations, fees, and invoice branding.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleQuickDownloadBackup}
            disabled={downloadingBackup}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800 font-bold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            title="Download complete offline store backup (.json)"
          >
            <Download className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${downloadingBackup ? 'animate-bounce' : ''}`} />
            <span>{downloadingBackup ? 'Exporting...' : '1-Click Backup'}</span>
          </button>
          <Link
            to="/owner/advanced-settings"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Advanced Settings</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Store Identity & Operations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
            <Store className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Store Identity & Operations</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Store Name</label>
              <input 
                type="text" 
                name="store_name" 
                value={settings.store_name} 
                onChange={handleChange} 
                required 
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Store Address</label>
              <textarea 
                name="store_address" 
                value={settings.store_address || ''} 
                onChange={handleChange} 
                rows="2"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 123 Market Street, City Center"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Store Latitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  name="store_latitude" 
                  value={settings.store_latitude || ''} 
                  onChange={handleChange} 
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Store Longitude</label>
                <input 
                  type="number" 
                  step="0.000001"
                  name="store_longitude" 
                  value={settings.store_longitude || ''} 
                  onChange={handleChange} 
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="is_open" 
                  checked={settings.is_open} 
                  onChange={handleChange} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Store is Open</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">Turn this off to prevent customers from placing new orders (e.g., during holidays or emergencies).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Ticker & UI */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">App Search Ticker</h2>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Popular Searches (Animated Search Bar)</label>
            <textarea 
              name="popular_searches" 
              value={settings.popular_searches || ''} 
              onChange={handleChange} 
              rows="5"
              className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Aashirvaad Atta&#10;Fresh Milk&#10;Fortune Oil"
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Enter one search term per line. These will animate in the top search bar placeholder in the mobile app.</p>
          </div>
        </div>

        {/* Order Constraints & Fees */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Order Constraints & Fees</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Minimum Order Amount (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                name="min_order_amount" 
                value={settings.min_order_amount} 
                onChange={handleChange} 
                required 
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Customers cannot checkout if their subtotal is below this.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Flat Packaging Fee (₹)</label>
              <input 
                type="number" 
                step="0.01" 
                name="packaging_fee" 
                value={settings.packaging_fee} 
                onChange={handleChange} 
                required 
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Added to every order automatically at checkout.</p>
            </div>
          </div>
        </div>

        {/* Delivery Rules */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-2">
            <Truck className="w-5 h-5 text-slate-400"/>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Home Delivery Rules</h2>
          </div>
          <div className="p-6 space-y-6">
            
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="is_home_delivery_active" 
                  checked={settings.is_home_delivery_active} 
                  onChange={handleChange} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">Enable Home Delivery</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Allow customers to choose home delivery at checkout</span>
              </div>
            </div>

            {settings.is_home_delivery_active && (
              <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Delivery Fee (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="delivery_fee" 
                      value={settings.delivery_fee} 
                      onChange={handleChange} 
                      required 
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Standard cost per delivery.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Free Threshold (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="free_delivery_threshold" 
                      value={settings.free_delivery_threshold} 
                      onChange={handleChange} 
                      required 
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Waive fee if order &gt; this amount.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Minimum Order (₹)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      name="min_delivery_order_amount" 
                      value={settings.min_delivery_order_amount} 
                      onChange={handleChange} 
                      required 
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Minimum cart total required.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Allowed Delivery Pincodes</label>
                  <textarea 
                    name="allowed_pincodes" 
                    value={settings.allowed_pincodes} 
                    onChange={handleChange} 
                    placeholder="e.g., 530001, 530002, 530004"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                  ></textarea>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comma-separated list. Leave blank to allow delivery anywhere.</p>
                </div>

                {/* Store Geofence & OpenStreetMap Radius Picker */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <StoreRadiusMapPicker
                    storeLat={settings.store_latitude}
                    storeLng={settings.store_longitude}
                    deliveryRadiusKm={settings.delivery_radius_km}
                    enforceDeliveryRadius={settings.enforce_delivery_radius}
                    onLocationChange={({ lat, lng }) => {
                      setSettings(prev => ({ ...prev, store_latitude: lat, store_longitude: lng }));
                    }}
                    onRadiusChange={(radius) => {
                      setSettings(prev => ({ ...prev, delivery_radius_km: radius }));
                    }}
                    onEnforceChange={(enforce) => {
                      setSettings(prev => ({ ...prev, enforce_delivery_radius: enforce }));
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory & Automation */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-400"/>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Inventory & Automation</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Low Stock Alert Threshold</label>
              <input 
                type="number" 
                name="low_stock_threshold" 
                value={settings.low_stock_threshold} 
                onChange={handleChange} 
                required 
                className="w-full md:w-1/3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Products with stock at or below this number will be highlighted.</p>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="auto_accept_orders" 
                  checked={settings.auto_accept_orders} 
                  onChange={handleChange} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Auto-Accept New Orders</span>
                <p className="text-xs text-gray-500 dark:text-slate-400">Automatically move orders from 'NEW' to 'ACCEPTED' state immediately upon placement.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email & App Password Configuration (SMTP) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-lg">
                <Mail className="w-5 h-5"/>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Email & App Password (SMTP)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure your store's outgoing email and 16-character Google App Password without code changes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${emailSettings.is_active && emailSettings.has_password ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
                <span className={`w-2 h-2 rounded-full ${emailSettings.is_active && emailSettings.has_password ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {emailSettings.is_active && emailSettings.has_password ? 'Active (Custom SMTP)' : 'Server Default (.env)'}
              </span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Activation Switch */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="pr-4">
                <span className="text-sm font-bold text-slate-900 dark:text-white block">Enable Dynamic Store Email</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">When enabled, order confirmations, invoice emails, password resets, and account notifications will be sent from this account.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  name="is_active" 
                  checked={emailSettings.is_active} 
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, is_active: e.target.checked }))} 
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Provider Selector Tabs */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Email Service Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleSelectProvider('gmail')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${emailSettings.provider === 'gmail' ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}`}
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Gmail / Google</span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">Recommended</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">smtp.gmail.com (Port 587)</div>
                  </div>
                  {emailSettings.provider === 'gmail' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectProvider('outlook')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${emailSettings.provider === 'outlook' ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}`}
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Outlook / Office 365</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">smtp.office365.com (Port 587)</div>
                  </div>
                  {emailSettings.provider === 'outlook' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectProvider('custom')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${emailSettings.provider === 'custom' ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-600/20 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'}`}
                >
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">Custom SMTP</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">SendGrid, Brevo, AWS SES, etc.</div>
                  </div>
                  {emailSettings.provider === 'custom' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Email Credentials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Sender Display Name</label>
                <input 
                  type="text" 
                  value={emailSettings.sender_name} 
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_name: e.target.value }))} 
                  placeholder="e.g. Narendra Kirana"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Displayed as sender name in customer inboxes.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Sender Email Address</label>
                  {settings.store_email && emailSettings.sender_email !== settings.store_email && (
                    <button
                      type="button"
                      onClick={() => setEmailSettings(prev => ({ ...prev, sender_email: settings.store_email }))}
                      className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium hover:underline"
                    >
                      Use store email ({settings.store_email})
                    </button>
                  )}
                </div>
                <input 
                  type="email" 
                  value={emailSettings.sender_email} 
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_email: e.target.value }))} 
                  placeholder={settings.store_email || "e.g. yourstore@gmail.com"}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">The email account used to authenticate and send.</p>
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    {emailSettings.provider === 'gmail' ? 'Google 16-Character App Password' : 'SMTP Password / API Secret'}
                  </label>
                  <div className="flex items-center gap-2">
                    {(emailSettings.has_password || emailSettings.app_password) ? (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Password saved securely
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                        <AlertTriangle size={12} /> Password not configured
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type={showAppPassword ? 'text' : 'password'} 
                    value={emailSettings.app_password} 
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, app_password: e.target.value }))} 
                    placeholder="Enter 16-character App Password (e.g. abcd efgh ijkl mnop)"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 pr-20 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-mono tracking-wider"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {emailSettings.app_password && (
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText(emailSettings.app_password);
                          setCopiedPassword(true);
                          setTimeout(() => setCopiedPassword(false), 2000);
                          toast.success('App Password copied to clipboard!');
                        }} 
                        title="Copy App Password"
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                      >
                        {copiedPassword ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                      </button>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setShowAppPassword(!showAppPassword)} 
                      title={showAppPassword ? "Hide password" : "Show password"}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                    >
                      {showAppPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>
                    {(emailSettings.has_password || emailSettings.app_password)
                      ? 'Saved securely in encrypted database. Click the eye icon to reveal, or edit and save to update.'
                      : 'Paste the 16-letter App Password generated from your Google Account security settings.'}
                  </span>
                  {showAppPassword && emailSettings.app_password && (
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-semibold">
                      {emailSettings.app_password.replace(/\s+/g, '').length} characters
                    </span>
                  )}
                </p>
              </div>

              {/* Custom SMTP host & port */}
              {emailSettings.provider === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">SMTP Host</label>
                    <input 
                      type="text" 
                      value={emailSettings.smtp_host} 
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))} 
                      placeholder="e.g. smtp.sendgrid.net"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">SMTP Port</label>
                    <input 
                      type="number" 
                      value={emailSettings.smtp_port} 
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: e.target.value }))} 
                      placeholder="587 or 465"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailSettings.use_tls} 
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, use_tls: e.target.checked }))} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Use TLS (Port 587)</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={emailSettings.use_ssl} 
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, use_ssl: e.target.checked }))} 
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Use SSL (Port 465)</span>
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Google App Password Guide Accordion */}
            {emailSettings.provider === 'gmail' && (
              <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setShowGoogleGuide(!showGoogleGuide)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-indigo-600" />
                    How to generate a 16-digit Google App Password (Click to view guide)
                  </span>
                  {showGoogleGuide ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                </button>

                {showGoogleGuide && (
                  <div className="p-4 pt-0 border-t border-indigo-100/60 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-slate-300 space-y-2 mt-2 leading-relaxed">
                    <p className="font-semibold text-indigo-900 dark:text-indigo-200">Follow these 4 quick steps in your Google Account:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-400">
                      <li>
                        Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline inline-flex items-center gap-0.5">Google Account Security <ExternalLink size={11}/></a> and ensure <strong>2-Step Verification</strong> is turned ON.
                      </li>
                      <li>
                        In the search bar at the top, type <strong>"App passwords"</strong> (or visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-bold underline inline-flex items-center gap-0.5">App Passwords <ExternalLink size={11}/></a>).
                      </li>
                      <li>
                        Give your app a name (e.g. <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-indigo-800 dark:text-indigo-300 font-mono">Narendra Kirana</code>) and click <strong>Create</strong>.
                      </li>
                      <li>
                        Google displays a yellow box with a 16-character code (e.g. <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-indigo-800 dark:text-indigo-300 font-mono">abcd efgh ijkl mnop</code>). Copy that code and paste it into the App Password box above.
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Test Status & Save Actions */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {emailSettings.last_tested_at ? (
                  <span>
                    Last Tested: <strong>{new Date(emailSettings.last_tested_at).toLocaleString()}</strong> — {emailSettings.last_test_status}
                  </span>
                ) : (
                  <span>No tests performed yet. Click "Send Test Email" to verify connection.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(true)}
                  disabled={testingEmail}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-600"/>
                  <span>Send Test Email</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveEmailSettings}
                  disabled={savingEmail}
                  className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5"/>
                  <span>{savingEmail ? 'Saving...' : 'Save Email Credentials'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Management */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400"/>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invoice Management</h2>
            </div>
            <Link 
              to="/owner/invoices"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View All Order Invoices</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100 dark:border-slate-800">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Store Address on Invoice</label>
                <textarea 
                  name="store_address" 
                  value={settings.store_address} 
                  onChange={handleChange} 
                  rows="2" 
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. 123 Market Street, City Center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Contact Number on Invoice</label>
                <input 
                  type="text" 
                  name="store_phone" 
                  value={settings.store_phone} 
                  onChange={handleChange} 
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. +91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Support Email on Invoice</label>
                <input 
                  type="email" 
                  name="store_email" 
                  value={settings.store_email} 
                  onChange={handleChange} 
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="e.g. support@narendrakirana.in"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Digital Signature</label>
              <ImageCropper
                aspect={2.5 / 1}
                currentImageUrl={settings.invoice_signature}
                label="Upload Signature"
                onCropComplete={(file) => setSignatureFile(file)}
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">White or transparent background recommended for crisp invoice rendering.</p>
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-2">
          <button 
            type="submit" 
            disabled={saving} 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition flex items-center gap-2 shadow-sm disabled:bg-indigo-400 active:scale-95"
          >
            <Save className="w-5 h-5"/>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Test Email Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-base">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Test SMTP Connection</span>
              </div>
              <button 
                type="button" 
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We will send a live verification email to check your sender address and 16-character Google App Password authentication.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Send Test Email To</label>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                disabled={testingEmail}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testingEmail}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                {testingEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting & Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Test Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
