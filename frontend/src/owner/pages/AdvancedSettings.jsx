import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  SlidersHorizontal,
  QrCode,
  ShieldCheck,
  Clock,
  Calendar,
  MessageCircle,
  Gift,
  Megaphone,
  Smartphone,
  Save,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const AdvancedSettings = () => {
  const [activeTab, setActiveTab] = useState('payments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // 1. UPI
    upi_id: '',
    upi_payee_name: '',
    enable_dynamic_upi_qr: true,
    upi_qr_image: null,
    // 2. Legal & Compliance
    fssai_license_number: '',
    gstin: '',
    enable_itemized_tax_invoice: true,
    invoice_terms_and_conditions: '',
    // 3. Timings & Emergency Pause
    is_emergency_paused: false,
    emergency_pause_message: '',
    auto_cutoff_orders: true,
    store_timings_json: {},
    // 4. Delivery Slots
    enable_time_slots: true,
    preparation_buffer_minutes: 30,
    max_orders_per_slot: 15,
    time_slots_json: [],
    // 5. WhatsApp Support
    enable_whatsapp_support: true,
    whatsapp_number: '',
    whatsapp_default_message: '',
    whatsapp_order_help_template: '',
    // 6. Loyalty Wallet & Referrals
    referral_bonus_referrer: '50.00',
    referral_bonus_referee: '50.00',
    referral_min_order_amount: '200.00',
    max_wallet_usage_percentage: 50,
    order_cashback_percentage: '2.00',
    // 7. Announcement & Festive
    enable_announcement_bar: true,
    announcement_text: '',
    announcement_bg_color: '#16a34a',
    announcement_text_color: '#ffffff',
    announcement_start_date: '',
    announcement_end_date: '',
    enable_festive_popup: false,
    festive_popup_title: '',
    festive_popup_content: '',
    festive_popup_image: null,
    // 8. Mobile App Version & Maintenance
    min_mobile_version: '1.0.0',
    latest_mobile_version: '1.0.0',
    force_app_update: false,
    app_update_url: '',
    app_update_message: '',
    is_maintenance_mode: false,
    maintenance_message: '',
    maintenance_estimated_end: '',
  });

  // File uploads
  const [upiQrFile, setUpiQrFile] = useState(null);
  const [upiQrPreview, setUpiQrPreview] = useState(null);
  const [festiveImageFile, setFestiveImageFile] = useState(null);
  const [festiveImagePreview, setFestiveImagePreview] = useState(null);

  // New slot inputs
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('12:00');
  const [newSlotLabel, setNewSlotLabel] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/store/settings/', { params: { t: Date.now() } });
      const data = res.data;
      setSettings(prev => ({
        ...prev,
        ...data,
        announcement_start_date: data.announcement_start_date ? data.announcement_start_date.slice(0, 16) : '',
        announcement_end_date: data.announcement_end_date ? data.announcement_end_date.slice(0, 16) : '',
        maintenance_estimated_end: data.maintenance_estimated_end ? data.maintenance_estimated_end.slice(0, 16) : '',
        store_timings_json: data.store_timings_json || {},
        time_slots_json: Array.isArray(data.time_slots_json) ? data.time_slots_json : [],
      }));
      if (data.upi_qr_image) setUpiQrPreview(data.upi_qr_image);
      if (data.festive_popup_image) setFestiveImagePreview(data.festive_popup_image);
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load advanced store settings.');
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

  const handleTimingChange = (day, field, value) => {
    setSettings(prev => {
      const currentTimings = prev.store_timings_json || {};
      const dayData = currentTimings[day] || { open: '08:00', close: '21:00', is_closed: false };
      return {
        ...prev,
        store_timings_json: {
          ...currentTimings,
          [day]: {
            ...dayData,
            [field]: value
          }
        }
      };
    });
  };

  const handleAddSlot = () => {
    const label = newSlotLabel.trim() || `${newSlotStart} - ${newSlotEnd}`;
    const newSlot = {
      id: Date.now().toString(),
      start_time: newSlotStart,
      end_time: newSlotEnd,
      label
    };
    setSettings(prev => ({
      ...prev,
      time_slots_json: [...(prev.time_slots_json || []), newSlot]
    }));
    setNewSlotLabel('');
  };

  const handleRemoveSlot = (index) => {
    setSettings(prev => ({
      ...prev,
      time_slots_json: (prev.time_slots_json || []).filter((_, i) => i !== index)
    }));
  };

  const handleUpiQrChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUpiQrFile(file);
      setUpiQrPreview(URL.createObjectURL(file));
    }
  };

  const handleFestiveImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFestiveImageFile(file);
      setFestiveImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        // UPI
        upi_id: settings.upi_id?.trim() || '',
        upi_payee_name: settings.upi_payee_name?.trim() || 'Narendra Kirana',
        enable_dynamic_upi_qr: Boolean(settings.enable_dynamic_upi_qr),
        // Legal
        fssai_license_number: (settings.fssai_license_number?.trim() || '').slice(0, 14),
        gstin: (settings.gstin?.trim() || '').toUpperCase().slice(0, 15),
        enable_itemized_tax_invoice: Boolean(settings.enable_itemized_tax_invoice),
        invoice_terms_and_conditions: settings.invoice_terms_and_conditions?.trim() || '',
        // Timings & Pause
        is_emergency_paused: Boolean(settings.is_emergency_paused),
        emergency_pause_message: settings.emergency_pause_message?.trim() || '',
        auto_cutoff_orders: Boolean(settings.auto_cutoff_orders),
        store_timings_json: settings.store_timings_json || {},
        // Slots
        enable_time_slots: Boolean(settings.enable_time_slots),
        preparation_buffer_minutes: parseInt(settings.preparation_buffer_minutes, 10) || 30,
        max_orders_per_slot: parseInt(settings.max_orders_per_slot, 10) || 15,
        time_slots_json: settings.time_slots_json || [],
        // WhatsApp
        enable_whatsapp_support: Boolean(settings.enable_whatsapp_support),
        whatsapp_number: settings.whatsapp_number?.trim() || '',
        whatsapp_default_message: settings.whatsapp_default_message?.trim() || '',
        whatsapp_order_help_template: settings.whatsapp_order_help_template?.trim() || '',
        // Loyalty & Referrals
        referral_bonus_referrer: (parseFloat(settings.referral_bonus_referrer) || 0).toFixed(2),
        referral_bonus_referee: (parseFloat(settings.referral_bonus_referee) || 0).toFixed(2),
        referral_min_order_amount: (parseFloat(settings.referral_min_order_amount) || 0).toFixed(2),
        max_wallet_usage_percentage: Math.min(100, Math.max(0, parseInt(settings.max_wallet_usage_percentage, 10) || 0)),
        order_cashback_percentage: (parseFloat(settings.order_cashback_percentage) || 0).toFixed(2),
        // Announcement & Festive
        enable_announcement_bar: Boolean(settings.enable_announcement_bar),
        announcement_text: settings.announcement_text?.trim() || '',
        announcement_bg_color: settings.announcement_bg_color || '#16a34a',
        announcement_text_color: settings.announcement_text_color || '#ffffff',
        announcement_start_date: settings.announcement_start_date ? new Date(settings.announcement_start_date).toISOString() : null,
        announcement_end_date: settings.announcement_end_date ? new Date(settings.announcement_end_date).toISOString() : null,
        enable_festive_popup: Boolean(settings.enable_festive_popup),
        festive_popup_title: settings.festive_popup_title?.trim() || '',
        festive_popup_content: settings.festive_popup_content?.trim() || '',
        // Mobile Version & Maintenance
        min_mobile_version: settings.min_mobile_version?.trim() || '1.0.0',
        latest_mobile_version: settings.latest_mobile_version?.trim() || '1.0.0',
        force_app_update: Boolean(settings.force_app_update),
        app_update_url: settings.app_update_url?.trim() || '',
        app_update_message: settings.app_update_message?.trim() || '',
        is_maintenance_mode: Boolean(settings.is_maintenance_mode),
        maintenance_message: settings.maintenance_message?.trim() || '',
        maintenance_estimated_end: settings.maintenance_estimated_end ? new Date(settings.maintenance_estimated_end).toISOString() : null,
      };

      let savePromise;
      if (upiQrFile || festiveImageFile) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            formData.append(k, JSON.stringify(v));
          } else if (v !== null && v !== undefined) {
            formData.append(k, v);
          }
        });
        if (upiQrFile) formData.append('upi_qr_image', upiQrFile);
        if (festiveImageFile) formData.append('festive_popup_image', festiveImageFile);
        savePromise = api.patch('/store/settings/', formData);
      } else {
        savePromise = api.patch('/store/settings/', payload);
      }

      toast.promise(savePromise, {
        loading: 'Saving advanced settings...',
        success: 'Advanced settings saved successfully!',
        error: (err) => {
          const errors = err.response?.data;
          if (errors && typeof errors === 'object') {
            const firstKey = Object.keys(errors)[0];
            const firstVal = Array.isArray(errors[firstKey]) ? errors[firstKey][0] : errors[firstKey];
            if (firstVal && typeof firstVal === 'string') return `${firstKey.replace(/_/g, ' ')}: ${firstVal}`;
          }
          return err.response?.data?.detail || 'Failed to save advanced settings.';
        }
      });

      await savePromise;
      setUpiQrFile(null);
      setFestiveImageFile(null);
      fetchSettings();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'payments', name: 'UPI & Payments', icon: QrCode, badge: '1' },
    { id: 'legal', name: 'Legal & FSSAI', icon: ShieldCheck, badge: '2' },
    { id: 'timings', name: 'Timings & Pause', icon: Clock, badge: '3' },
    { id: 'slots', name: 'Delivery Slots', icon: Calendar, badge: '4' },
    { id: 'whatsapp', name: 'WhatsApp Support', icon: MessageCircle, badge: '5' },
    { id: 'loyalty', name: 'Wallet & Cashback', icon: Gift, badge: '6' },
    { id: 'announcements', name: 'Marquee & Popup', icon: Megaphone, badge: '7' },
    { id: 'mobile', name: 'Mobile & Maintenance', icon: Smartphone, badge: '8' },
  ];

  if (loading) {
    return <div className="p-12 text-center text-gray-500 font-medium">Loading advanced settings...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-1">
            <Link to="/owner/settings" className="hover:text-indigo-600 flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Settings</span>
            </Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300">Advanced Controls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-sm">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Settings</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">Configure real-time payments, legal compliance, order pacing, and customer loyalty.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/owner/settings"
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 text-xs font-bold transition-all shadow-sm"
          >
            Basic Settings
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Emergency Pause Warning Banner */}
      {settings.is_emergency_paused && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-bold text-amber-800 dark:text-amber-300">Store is Currently Emergency Paused!</div>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              Online checkout is temporarily blocked with notice: <em>"{settings.emergency_pause_message || 'Experiencing high volume'}"</em>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('timings')}
            className="text-xs font-bold text-amber-700 dark:text-amber-300 underline hover:opacity-80 shrink-0"
          >
            Adjust Timings
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-t-xl font-bold text-xs whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 sm:p-8">
        {/* ========================================================================= */}
        {/* 1. UPI & PAYMENTS */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-indigo-600" />
                <span>Store UPI QR & Payment Management</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Accept UPI payments directly into your bank account with zero gateway fee deductions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Merchant UPI ID / VPA</label>
                <input
                  type="text"
                  name="upi_id"
                  value={settings.upi_id}
                  onChange={handleChange}
                  placeholder="e.g. narendrakirana@okaxis"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Customer payments will be routed to this VPA address.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">UPI Payee Display Name</label>
                <input
                  type="text"
                  name="upi_payee_name"
                  value={settings.upi_payee_name}
                  onChange={handleChange}
                  placeholder="e.g. Narendra Kirana Store"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Name shown inside customer's GPay, PhonePe, or Paytm app.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Dynamic Vector UPI QR Code</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Generates instant client-side QR codes with exact order total and UPI intent on web and mobile checkout.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_dynamic_upi_qr"
                  checked={settings.enable_dynamic_upi_qr}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Physical Counter Standee QR Image (Optional)</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30">
                {upiQrPreview ? (
                  <div className="w-24 h-24 rounded-lg bg-white p-1 border shadow-sm shrink-0 flex items-center justify-center overflow-hidden">
                    <img src={upiQrPreview} alt="Standee QR" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gray-100 dark:bg-slate-700 border flex items-center justify-center text-gray-400 shrink-0">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}
                <div className="space-y-1 text-center sm:text-left">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpiQrChange}
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="text-[11px] text-gray-400">PNG, JPG, or SVG. Displayed to customers if they want to scan the shop standee.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. LEGAL & COMPLIANCE */}
        {/* ========================================================================= */}
        {activeTab === 'legal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Legal & Compliance (FSSAI & GSTIN)</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Display verified license credentials and tax information on all printed and digital invoices.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">
                  14-Digit FSSAI License Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="fssai_license_number"
                    value={settings.fssai_license_number}
                    onChange={handleChange}
                    maxLength={14}
                    placeholder="e.g. 10020042000123"
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  {settings.fssai_license_number && settings.fssai_license_number.length === 14 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Valid</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Mandatory for retail grocery and food product sellers.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">
                  15-Character GSTIN
                </label>
                <input
                  type="text"
                  name="gstin"
                  value={settings.gstin}
                  onChange={handleChange}
                  maxLength={15}
                  placeholder="e.g. 36AAAAA0000A1Z5"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Printed on tax invoices for B2B input tax credit.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Itemized Tax Invoice</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Breaks down CGST, SGST, and IGST components on order receipts and invoice downloads.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_itemized_tax_invoice"
                  checked={settings.enable_itemized_tax_invoice}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Invoice Terms & Return Policy</label>
              <textarea
                name="invoice_terms_and_conditions"
                value={settings.invoice_terms_and_conditions}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="1. Goods once sold will not be taken back without original bill.&#10;2. Perishable goods must be reported within 24 hours.&#10;3. In case of dispute, local jurisdiction applies."
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Printed in the terms section at the bottom of all customer invoices.</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. STORE TIMINGS & EMERGENCY PAUSE */}
        {/* ========================================================================= */}
        {activeTab === 'timings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Store Operating Schedule & Emergency Controls</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Configure automated cut-offs, weekly open hours, or instantly pause incoming orders during high volume.</p>
            </div>

            {/* Emergency Pause Card */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${settings.is_emergency_paused ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500/40' : 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-800'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${settings.is_emergency_paused ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-gray-900 dark:text-white">1-Click Emergency Order Pause</div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Blocks customers from placing orders immediately without taking the store offline.</p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="is_emergency_paused"
                    checked={settings.is_emergency_paused}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {settings.is_emergency_paused && (
                <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900/40 space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">Customer Alert Notice</label>
                  <input
                    type="text"
                    name="emergency_pause_message"
                    value={settings.emergency_pause_message}
                    onChange={handleChange}
                    placeholder="We are experiencing high order volume and will resume shortly!"
                    className="w-full rounded-lg border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Auto Cutoff Toggle */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Automated Order Cut-Off</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Automatically prevent customers from placing orders when store is outside scheduled operating hours.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="auto_cutoff_orders"
                  checked={settings.auto_cutoff_orders}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Weekly Schedule */}
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white mb-3">Weekly Operating Schedule</div>
              <div className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                  const dayData = (settings.store_timings_json || {})[day] || { open: '08:00', close: '21:00', is_closed: false };
                  return (
                    <div
                      key={day}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        dayData.is_closed ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:w-36">
                        <span className="font-bold capitalize text-sm text-gray-900 dark:text-white">{day}</span>
                        {dayData.is_closed && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                            Closed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 flex-1">
                        {!dayData.is_closed ? (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500 dark:text-slate-400">Open:</span>
                            <input
                              type="time"
                              value={dayData.open || '08:00'}
                              onChange={(e) => handleTimingChange(day, 'open', e.target.value)}
                              className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono"
                            />
                            <span className="text-gray-500 dark:text-slate-400 mx-1">to</span>
                            <span className="text-gray-500 dark:text-slate-400">Close:</span>
                            <input
                              type="time"
                              value={dayData.close || '21:00'}
                              onChange={(e) => handleTimingChange(day, 'close', e.target.value)}
                              className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono"
                            />
                          </div>
                        ) : (
                          <span className="text-xs text-rose-600 font-medium">Orders paused for the entire day.</span>
                        )}
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={Boolean(dayData.is_closed)}
                          onChange={(e) => handleTimingChange(day, 'is_closed', e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <span className="text-xs text-gray-600 dark:text-slate-400">Closed Today</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. DELIVERY & PICKUP TIME SLOTS */}
        {/* ========================================================================= */}
        {activeTab === 'slots' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <span>Delivery & Pickup Time Slots</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Allow customers to choose specific delivery/pickup windows with enforced order capacity limits.</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Scheduled Time Slots</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">When enabled, customers must select a slot during checkout (Today / Tomorrow).</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_time_slots"
                  checked={settings.enable_time_slots}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Preparation Buffer Time (Minutes)</label>
                <input
                  type="number"
                  name="preparation_buffer_minutes"
                  value={settings.preparation_buffer_minutes}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Slots starting within this time from now will be hidden for Today.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Max Orders per Slot Cap</label>
                <input
                  type="number"
                  name="max_orders_per_slot"
                  value={settings.max_orders_per_slot}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Prevents packing bottlenecks; slots showing fully booked will reject new orders.</p>
              </div>
            </div>

            {/* Slots List & Builder */}
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-white mb-3">Configured Time Slots</div>
              <div className="space-y-2 mb-4">
                {(settings.time_slots_json || []).length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed text-center text-xs text-gray-400">
                    No time slots configured. Add your first slot below.
                  </div>
                ) : (
                  (settings.time_slots_json || []).map((slot, index) => (
                    <div
                      key={slot.id || index}
                      className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{slot.label}</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">({slot.start_time} - {slot.end_time})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Slot Input Row */}
              <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800/50 flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Slot Label (e.g. Morning 9 AM - 12 PM)"
                  value={newSlotLabel}
                  onChange={(e) => setNewSlotLabel(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="time"
                    value={newSlotStart}
                    onChange={(e) => setNewSlotStart(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={newSlotEnd}
                    onChange={(e) => setNewSlotEnd(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Slot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. WHATSAPP SUPPORT QUICK-CONNECT */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
                <span>WhatsApp Support Quick-Connect</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Provide 1-click customer help via WhatsApp across customer web and mobile apps.</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Floating WhatsApp Bubble & Quick Actions</div>
                <p className="text-xs text-gray-500 dark:text-slate-400">Shows floating green chat button on web and mobile home screen.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  name="enable_whatsapp_support"
                  checked={settings.enable_whatsapp_support}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">WhatsApp Phone Number</label>
              <input
                type="text"
                name="whatsapp_number"
                value={settings.whatsapp_number}
                onChange={handleChange}
                placeholder="e.g. +91 98765 43210"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Country code will be automatically normalized when launching WhatsApp.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Default Floating Chat Greeting</label>
              <input
                type="text"
                name="whatsapp_default_message"
                value={settings.whatsapp_default_message}
                onChange={handleChange}
                placeholder="Hi Narendra Kirana, I need assistance with grocery orders."
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Order Help Template</label>
              <input
                type="text"
                name="whatsapp_order_help_template"
                value={settings.whatsapp_order_help_template}
                onChange={handleChange}
                placeholder="Hi Narendra Kirana, I need help with Order #{order_id}"
                className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Use <code className="text-emerald-600 font-bold">{'{order_id}'}</code> to automatically insert the customer's actual order ID.</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. LOYALTY WALLET & REFERRALS */}
        {/* ========================================================================= */}
        {activeTab === 'loyalty' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                <span>Loyalty Wallet & Referral Rules</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Configure repeat-purchase cashbacks, referral incentives, and order wallet redemption limits.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Max Wallet Usage per Order (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    name="max_wallet_usage_percentage"
                    value={settings.max_wallet_usage_percentage}
                    onChange={handleChange}
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="font-extrabold text-sm w-12 text-right text-indigo-600 dark:text-indigo-400">
                    {settings.max_wallet_usage_percentage}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Caps maximum amount customer can deduct from their wallet balance per checkout.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Order Cashback Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  name="order_cashback_percentage"
                  value={settings.order_cashback_percentage}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Automatically credited to customer's wallet when order is marked COMPLETED.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="text-sm font-bold text-gray-900 dark:text-white mb-3">Referral Program Rules</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Referrer Reward (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="referral_bonus_referrer"
                    value={settings.referral_bonus_referrer}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Referee Sign-Up Reward (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="referral_bonus_referee"
                    value={settings.referral_bonus_referee}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Min Spend to Activate (₹)</label>
                  <input
                    type="number"
                    step="1"
                    name="referral_min_order_amount"
                    value={settings.referral_min_order_amount}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. ANNOUNCEMENT MARQUEE & FESTIVE POPUP */}
        {/* ========================================================================= */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-600" />
                <span>Announcement Marquee & Festive Popup</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Broadcast high-priority notices, discounts, and festive modals to all shoppers.</p>
            </div>

            {/* Announcement Ticker */}
            <div className="space-y-4 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-gray-900 dark:text-white">Top Scrolling Announcement Ticker</div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_announcement_bar"
                    checked={settings.enable_announcement_bar}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Announcement Text</label>
                <input
                  type="text"
                  name="announcement_text"
                  value={settings.announcement_text}
                  onChange={handleChange}
                  placeholder="🎉 Free Home Delivery on orders above ₹499! Use code FIRST50 for ₹50 off."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="announcement_bg_color"
                    value={settings.announcement_bg_color || '#16a34a'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 block">Banner Background</span>
                    <span className="text-[11px] text-gray-400 font-mono">{settings.announcement_bg_color}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    name="announcement_text_color"
                    value={settings.announcement_text_color || '#ffffff'}
                    onChange={handleChange}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300 block">Text Color</span>
                    <span className="text-[11px] text-gray-400 font-mono">{settings.announcement_text_color}</span>
                  </div>
                </div>
              </div>

              {/* Live Preview Bar */}
              <div 
                className="py-2 px-4 rounded-xl text-xs font-bold text-center overflow-hidden whitespace-nowrap"
                style={{ backgroundColor: settings.announcement_bg_color || '#16a34a', color: settings.announcement_text_color || '#ffffff' }}
              >
                {settings.announcement_text || 'Announcement ticker preview text...'}
              </div>
            </div>

            {/* Festive Popup Modal */}
            <div className="space-y-4 p-5 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-gray-900 dark:text-white">Festive Offer Welcome Popup</div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_festive_popup"
                    checked={settings.enable_festive_popup}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Popup Title</label>
                <input
                  type="text"
                  name="festive_popup_title"
                  value={settings.festive_popup_title}
                  onChange={handleChange}
                  placeholder="Special Festive Offer! 🪔"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Popup Message Content</label>
                <textarea
                  name="festive_popup_content"
                  value={settings.festive_popup_content}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Enjoy flat discounts on all festival sweets, dry fruits, and grocery essentials!"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">Festive Banner Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {festiveImagePreview && (
                    <img src={festiveImagePreview} alt="Festive Preview" className="w-20 h-14 object-cover rounded-lg border shadow-sm" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFestiveImageChange}
                    className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. MOBILE APP VERSION & MAINTENANCE CONTROL */}
        {/* ========================================================================= */}
        {activeTab === 'mobile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <span>Mobile App Version & Whole-Store Maintenance</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Control Android/iOS minimum app version gates and trigger storewide scheduled maintenance overlays.</p>
            </div>

            {/* Whole Store Maintenance Mode */}
            <div className={`p-5 rounded-2xl border-2 transition-all ${settings.is_maintenance_mode ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-500/40' : 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white">Whole-Store Maintenance Mode</div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Shows full-screen maintenance message on both customer web and mobile app.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="is_maintenance_mode"
                    checked={settings.is_maintenance_mode}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {settings.is_maintenance_mode && (
                <div className="mt-4 pt-4 border-t border-rose-200 dark:border-rose-900/40 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-rose-900 dark:text-rose-300 mb-1">Maintenance Message</label>
                    <input
                      type="text"
                      name="maintenance_message"
                      value={settings.maintenance_message}
                      onChange={handleChange}
                      placeholder="We are upgrading our servers to serve you better. Back online soon!"
                      className="w-full rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-rose-900 dark:text-rose-300 mb-1">Estimated Completion Time</label>
                    <input
                      type="datetime-local"
                      name="maintenance_estimated_end"
                      value={settings.maintenance_estimated_end}
                      onChange={handleChange}
                      className="rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile App Version Gates */}
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800">
              <div className="text-sm font-bold text-gray-900 dark:text-white">Mobile App Release & Force-Update Gates</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Minimum Supported Version</label>
                  <input
                    type="text"
                    name="min_mobile_version"
                    value={settings.min_mobile_version}
                    onChange={handleChange}
                    placeholder="1.0.0"
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Older versions will be forced to update.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Latest Release Version</label>
                  <input
                    type="text"
                    name="latest_mobile_version"
                    value={settings.latest_mobile_version}
                    onChange={handleChange}
                    placeholder="1.1.0"
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>

                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Force App Update</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="force_app_update"
                      checked={settings.force_app_update}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Play Store / App Store Download URL</label>
                <input
                  type="url"
                  name="app_update_url"
                  value={settings.app_update_url}
                  onChange={handleChange}
                  placeholder="https://play.google.com/store/apps/details?id=com.narendrakirana.app"
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Force Update Prompt Message</label>
                <input
                  type="text"
                  name="app_update_message"
                  value={settings.app_update_message}
                  onChange={handleChange}
                  placeholder="A critical new version of Narendra Kirana is available. Please update to continue shopping."
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSettings;
