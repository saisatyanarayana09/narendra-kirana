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
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">Store Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure your core store operations, fees, and invoice branding.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleQuickDownloadBackup}
            disabled={downloadingBackup}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingBackup ? 'Exporting...' : 'Backup'}</span>
          </button>
          <Link
            to="/owner/advanced-settings"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Advanced Settings</span>
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-slate-100 dark:divide-slate-800">

        {/* Section 1: Store Identity & Operations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Store Identity</h2>
            <p className="text-sm text-slate-500 mt-1">Basic information about your store and its location.</p>
          </div>
          <div className="md:col-span-2 space-y-5 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Store Name</label>
              <input 
                type="text" 
                name="store_name" 
                value={settings.store_name} 
                onChange={handleChange} 
                required 
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Store Address</label>
              <textarea 
                name="store_address" 
                value={settings.store_address || ''} 
                onChange={handleChange} 
                rows="2"
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Latitude</label>
                <input 
                  type="number" step="0.000001" name="store_latitude" 
                  value={settings.store_latitude || ''} onChange={handleChange} 
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Longitude</label>
                <input 
                  type="number" step="0.000001" name="store_longitude" 
                  value={settings.store_longitude || ''} onChange={handleChange} 
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Store is Open</span>
                <p className="text-sm text-slate-500">Toggle to pause incoming orders.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_open" checked={settings.is_open} onChange={handleChange} className="sr-only peer"/>
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Order Constraints & Fees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Order Settings</h2>
            <p className="text-sm text-slate-500 mt-1">Configure minimum amounts and standard fees.</p>
          </div>
          <div className="md:col-span-2 grid grid-cols-2 gap-5 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Min Order Amount (₹)</label>
              <input type="number" step="0.01" name="min_order_amount" value={settings.min_order_amount} onChange={handleChange} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Packaging Fee (₹)</label>
              <input type="number" step="0.01" name="packaging_fee" value={settings.packaging_fee} onChange={handleChange} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div className="col-span-2 flex items-center justify-between pt-2">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Auto-Accept Orders</span>
                <p className="text-sm text-slate-500">Automatically move orders to 'ACCEPTED' state.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="auto_accept_orders" checked={settings.auto_accept_orders} onChange={handleChange} className="sr-only peer"/>
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Delivery Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Delivery Config</h2>
            <p className="text-sm text-slate-500 mt-1">Manage delivery areas, fees, and constraints.</p>
          </div>
          <div className="md:col-span-2 space-y-6 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Enable Home Delivery</span>
                <p className="text-sm text-slate-500">Allow customers to choose home delivery.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_home_delivery_active" checked={settings.is_home_delivery_active} onChange={handleChange} className="sr-only peer"/>
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            {settings.is_home_delivery_active && (
              <div className="space-y-5 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Delivery Fee (₹)</label>
                    <input type="number" step="0.01" name="delivery_fee" value={settings.delivery_fee} onChange={handleChange} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Free Above (₹)</label>
                    <input type="number" step="0.01" name="free_delivery_threshold" value={settings.free_delivery_threshold} onChange={handleChange} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Min Delivery (₹)</label>
                    <input type="number" step="0.01" name="min_delivery_order_amount" value={settings.min_delivery_order_amount} onChange={handleChange} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Allowed Pincodes (Comma separated)</label>
                  <input type="text" name="allowed_pincodes" value={settings.allowed_pincodes} onChange={handleChange} placeholder="530001, 530002" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
                </div>
                <div className="pt-2">
                  <StoreRadiusMapPicker
                    storeLat={settings.store_latitude}
                    storeLng={settings.store_longitude}
                    deliveryRadiusKm={settings.delivery_radius_km}
                    enforceDeliveryRadius={settings.enforce_delivery_radius}
                    onLocationChange={({ lat, lng }) => setSettings(prev => ({ ...prev, store_latitude: lat, store_longitude: lng }))}
                    onRadiusChange={(radius) => setSettings(prev => ({ ...prev, delivery_radius_km: radius }))}
                    onEnforceChange={(enforce) => setSettings(prev => ({ ...prev, enforce_delivery_radius: enforce }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Email Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Email & SMTP</h2>
            <p className="text-sm text-slate-500 mt-1">Configure automated store emails.</p>
          </div>
          <div className="md:col-span-2 space-y-6 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">Enable Custom SMTP</span>
                <p className="text-sm text-slate-500">Send transactional emails using these credentials.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="is_active" checked={emailSettings.is_active} onChange={(e) => setEmailSettings(prev => ({...prev, is_active: e.target.checked}))} className="sr-only peer"/>
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-900"></div>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {['gmail', 'outlook', 'custom'].map(provider => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleSelectProvider(provider)}
                  className={`p-3 rounded-md border text-center text-sm font-medium transition ${emailSettings.provider === provider ? 'border-slate-900 bg-slate-50 text-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sender Name</label>
                <input type="text" value={emailSettings.sender_name} onChange={(e) => setEmailSettings(prev => ({...prev, sender_name: e.target.value}))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Sender Email</label>
                <input type="email" value={emailSettings.sender_email} onChange={(e) => setEmailSettings(prev => ({...prev, sender_email: e.target.value}))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">App Password / Secret</label>
                <div className="relative">
                  <input type={showAppPassword ? "text" : "password"} value={emailSettings.app_password} onChange={(e) => setEmailSettings(prev => ({...prev, app_password: e.target.value}))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 font-mono" />
                  <button type="button" onClick={() => setShowAppPassword(!showAppPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showAppPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button type="button" onClick={() => setTestModalOpen(true)} className="px-3 py-1.5 border border-slate-200 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                Test Connection
              </button>
              <button type="button" onClick={handleSaveEmailSettings} disabled={savingEmail} className="px-4 py-1.5 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50">
                {savingEmail ? 'Saving...' : 'Save Email Config'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Invoice Branding */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="md:col-span-1">
            <h2 className="text-base font-medium text-slate-900 dark:text-white">Invoices</h2>
            <p className="text-sm text-slate-500 mt-1">Configure contact details and signature.</p>
          </div>
          <div className="md:col-span-2 space-y-5 bg-white dark:bg-slate-900 p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact Phone</label>
                <input type="text" name="store_phone" value={settings.store_phone} onChange={handleChange} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Support Email</label>
                <input type="email" name="store_email" value={settings.store_email} onChange={handleChange} className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Digital Signature</label>
              <ImageCropper aspect={2.5/1} currentImageUrl={settings.invoice_signature} label="Upload Signature" onCropComplete={(file) => setSignatureFile(file)} />
            </div>
          </div>
        </div>

        <div className="pt-6 flex justify-end">
          <button type="submit" disabled={saving} className="px-5 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition shadow-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

      </form>

      {/* Test Modal (simplified) */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 max-w-sm w-full p-6">
            <h3 className="font-medium text-slate-900 mb-4">Send Test Email</h3>
            <input type="email" value={testRecipient} onChange={e => setTestRecipient(e.target.value)} placeholder="recipient@example.com" className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-900 mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setTestModalOpen(false)} className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSendTest} disabled={testingEmail} className="px-4 py-1.5 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">{testingEmail ? 'Sending...' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
