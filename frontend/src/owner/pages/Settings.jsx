import { useState, useEffect } from 'react';
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
  QrCode,
  CreditCard,
  ShieldCheck,
  Clock,
  Calendar,
  MessageSquare,
  Gift,
  Megaphone,
  Smartphone,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Check,
  AlertCircle,
  Sliders,
  Sparkles,
  Power,
  Flame,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ImageCropper from '../components/ImageCropper';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const DEFAULT_TIMINGS = {
  monday: { open: '08:00', close: '21:30', is_closed: false },
  tuesday: { open: '08:00', close: '21:30', is_closed: false },
  wednesday: { open: '08:00', close: '21:30', is_closed: false },
  thursday: { open: '08:00', close: '21:30', is_closed: false },
  friday: { open: '08:00', close: '21:30', is_closed: false },
  saturday: { open: '08:00', close: '22:00', is_closed: false },
  sunday: { open: '08:30', close: '20:00', is_closed: false },
};

const DEFAULT_SLOTS = [
  { id: 'slot-1', label: 'Morning Express', start_time: '08:00', end_time: '11:00', is_active: true, max_orders: 15 },
  { id: 'slot-2', label: 'Afternoon Delivery', start_time: '12:00', end_time: '15:30', is_active: true, max_orders: 15 },
  { id: 'slot-3', label: 'Evening Prime', start_time: '17:00', end_time: '20:30', is_active: true, max_orders: 20 },
];

const TABS = [
  { id: 'general', label: 'General & Store', icon: Store, desc: 'Identity, constraints & catalog visibility' },
  { id: 'payments', label: 'UPI QR & Payments', icon: QrCode, desc: 'Merchant VPA, standee & dynamic checkout' },
  { id: 'legal', label: 'Legal & Compliance', icon: ShieldCheck, desc: 'FSSAI 14-digit, GSTIN & invoice terms' },
  { id: 'timings', label: 'Timings & Emergency', icon: Clock, desc: 'Weekly schedule & 1-click pause' },
  { id: 'slots', label: 'Delivery Time Slots', icon: Calendar, desc: 'Slot builder, buffers & order caps' },
  { id: 'delivery', label: 'Home Delivery Rules', icon: Truck, desc: 'Delivery fee, free threshold & pincodes' },
  { id: 'whatsapp', label: 'WhatsApp Support', icon: MessageSquare, desc: 'Quick-connect & automated templates' },
  { id: 'loyalty', label: 'Loyalty & Referral', icon: Gift, desc: 'Referral rewards & wallet usage rules' },
  { id: 'announcements', label: 'Announcements & Popups', icon: Megaphone, desc: 'Marquee banner ticker & festive modal' },
  { id: 'app_version', label: 'App & Maintenance', icon: Smartphone, desc: 'Version enforcement & maintenance mode' },
  { id: 'invoicing', label: 'Invoice & Signature', icon: FileText, desc: 'Billing header & authorized signature' },
  { id: 'email', label: 'Email & SMTP', icon: Mail, desc: 'Custom credentials & 16-char App Password' },
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');

  const [settings, setSettings] = useState({
    // Store Identity & Operations
    store_name: 'Narendra Kirana',
    store_address: '123 Market Street, City Center',
    store_phone: '+91 98765 43210',
    store_email: 'support@narendrakirana.in',
    is_open: true,
    min_order_amount: '0.00',
    packaging_fee: '0.00',
    low_stock_threshold: 5,
    auto_accept_orders: false,
    show_popular_picks: true,
    popular_picks_title: 'Popular picks',
    show_great_deals: true,
    great_deals_title: 'Great Deals',
    show_new_arrivals: true,
    new_arrivals_title: 'New Arrivals',

    // Delivery & Logistics
    delivery_mode: 'PICKUP',
    is_home_delivery_active: false,
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    min_delivery_order_amount: '150.00',
    allowed_pincodes: '',

    // 1. UPI QR & Payment Management
    upi_id: '',
    upi_payee_name: 'Narendra Kirana',
    payee_name: 'Narendra Kirana',
    upi_qr_image: null,
    upi_qr_standee: null,
    enable_dynamic_upi_qr: true,

    // 2. Legal & Compliance
    fssai_license_number: '',
    gstin: '',
    enable_itemized_tax_invoice: true,
    invoice_terms_and_conditions: '1. Goods once sold will not be taken back without original bill.\n2. In case of any dispute, local jurisdiction applies.\n3. Perishable goods must be reported within 24 hours.',
    terms_and_conditions: '1. Goods once sold will not be taken back without original bill.\n2. In case of any dispute, local jurisdiction applies.\n3. Perishable goods must be reported within 24 hours.',

    // 3. Operating Timings & Emergency Pause
    is_emergency_paused: false,
    emergency_pause_message: 'We are currently experiencing high order volume and will resume shortly. Thank you for your patience!',
    auto_cutoff_orders: true,
    store_timings_json: DEFAULT_TIMINGS,

    // 4. Delivery & Pickup Time Slots
    enable_time_slots: true,
    preparation_buffer_minutes: 30,
    max_orders_per_slot: 15,
    time_slots_json: DEFAULT_SLOTS,

    // 5. WhatsApp Support Quick-Connect
    enable_whatsapp_support: true,
    whatsapp_number: '+91 98765 43210',
    whatsapp_phone_number: '+91 98765 43210',
    whatsapp_default_message: 'Hi Narendra Kirana, I need help with my grocery order.',
    whatsapp_order_help_template: 'Hi Narendra Kirana, I need help with Order #{order_id}',

    // 6. Loyalty Wallet & Referral Rules
    referral_bonus_referrer: '50.00',
    referral_bonus_referee: '50.00',
    referral_min_order_amount: '200.00',
    max_wallet_usage_percentage: 50,
    order_cashback_percentage: '2.00',

    // 7. Announcement Marquee & Festive Popup
    enable_announcement_bar: true,
    announcement_text: '🎉 Free Home Delivery on orders above ₹499! Use code FIRST50 for ₹50 off on first order.',
    announcement_bg_color: '#ef4444',
    announcement_text_color: '#ffffff',
    announcement_start_date: '',
    announcement_end_date: '',
    enable_festive_popup: false,
    festive_popup_title: 'Special Festive Offer! 🪔',
    festive_popup_content: 'Enjoy huge festive discounts on all grocery essentials. Shop today with express same-day doorstep delivery!',
    festive_popup_image: null,

    // 8. Mobile App Version & Maintenance Control
    min_mobile_version: '1.0.0',
    latest_mobile_version: '1.0.0',
    force_app_update: false,
    app_update_url: 'https://play.google.com/store/apps/details?id=com.narendrakirana.app',
    app_update_message: 'A new and improved version of Narendra Kirana is available. Please update to continue shopping.',
    is_maintenance_mode: false,
    maintenance_message: 'We are currently performing scheduled maintenance to serve you better. We will be back online shortly!',
    maintenance_estimated_end: '',

    // Invoicing Signature
    invoice_signature: null,
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
  const [savingEmail, setSavingEmail] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // File crop states
  const [signatureFile, setSignatureFile] = useState(null);
  const [upiQrFile, setUpiQrFile] = useState(null);
  const [festiveImageFile, setFestiveImageFile] = useState(null);

  // Time Slot Builder UI helper state
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [slotForm, setSlotForm] = useState({ label: '', start_time: '09:00', end_time: '12:00', max_orders: 15, is_active: true });
  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // Live preview popups
  const [showFestivePreview, setShowFestivePreview] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

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
          app_password: ''
        }));
        if (response.data.sender_email && !testRecipient) {
          setTestRecipient(response.data.sender_email);
        }
      }
    } catch (err) {
      console.error('Failed to load email settings:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/store/settings/', { params: { t: Date.now() } });
      if (response.data) {
        const d = response.data;
        setSettings(prev => {
          let parsedTimings = d.store_timings_json || d.operating_hours || prev.store_timings_json;
          if (typeof parsedTimings === 'string') {
            try { parsedTimings = JSON.parse(parsedTimings); } catch (e) { parsedTimings = DEFAULT_TIMINGS; }
          }
          if (!parsedTimings || typeof parsedTimings !== 'object' || Object.keys(parsedTimings).length === 0) {
            parsedTimings = DEFAULT_TIMINGS;
          }

          let parsedSlots = d.time_slots_json || d.time_slots || prev.time_slots_json;
          if (typeof parsedSlots === 'string') {
            try { parsedSlots = JSON.parse(parsedSlots); } catch (e) { parsedSlots = DEFAULT_SLOTS; }
          }
          if (!Array.isArray(parsedSlots) || parsedSlots.length === 0) {
            parsedSlots = DEFAULT_SLOTS;
          }

          return {
            ...prev,
            ...d,
            store_timings_json: parsedTimings,
            time_slots_json: parsedSlots,
            upi_payee_name: d.upi_payee_name || d.payee_name || prev.upi_payee_name,
            payee_name: d.upi_payee_name || d.payee_name || prev.payee_name,
            upi_qr_image: d.upi_qr_image || d.upi_qr_standee || prev.upi_qr_image,
            upi_qr_standee: d.upi_qr_image || d.upi_qr_standee || prev.upi_qr_standee,
            whatsapp_number: d.whatsapp_number || d.whatsapp_phone_number || prev.whatsapp_number,
            whatsapp_phone_number: d.whatsapp_number || d.whatsapp_phone_number || prev.whatsapp_phone_number,
            invoice_terms_and_conditions: d.invoice_terms_and_conditions || d.terms_and_conditions || prev.invoice_terms_and_conditions,
            terms_and_conditions: d.invoice_terms_and_conditions || d.terms_and_conditions || prev.terms_and_conditions,
          };
        });
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load store settings.');
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

  // Schedule timing updates
  const handleTimingChange = (dayKey, field, val) => {
    setSettings(prev => {
      const updated = {
        ...prev.store_timings_json,
        [dayKey]: {
          ...(prev.store_timings_json?.[dayKey] || { open: '08:00', close: '21:30', is_closed: false }),
          [field]: val
        }
      };
      return { ...prev, store_timings_json: updated };
    });
  };

  const handleCopyMondayToWeekdays = () => {
    const mondayConfig = settings.store_timings_json?.monday || { open: '08:00', close: '21:30', is_closed: false };
    setSettings(prev => {
      const updated = { ...prev.store_timings_json };
      ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach(day => {
        updated[day] = { ...mondayConfig };
      });
      return { ...prev, store_timings_json: updated };
    });
    toast.success('Applied Monday hours to Tuesday through Saturday!');
  };

  // Time Slot Builder Handlers
  const handleSaveSlot = (e) => {
    e.preventDefault();
    if (!slotForm.label.trim()) {
      toast.error('Please enter a slot label.');
      return;
    }
    setSettings(prev => {
      let slots = [...(prev.time_slots_json || [])];
      if (editingSlotId) {
        slots = slots.map(s => s.id === editingSlotId ? { ...s, ...slotForm } : s);
      } else {
        slots.push({
          id: `slot-${Date.now()}`,
          ...slotForm
        });
      }
      return { ...prev, time_slots_json: slots };
    });
    setIsAddingSlot(false);
    setEditingSlotId(null);
    setSlotForm({ label: '', start_time: '09:00', end_time: '12:00', max_orders: 15, is_active: true });
    toast.success(editingSlotId ? 'Slot updated!' : 'New time slot created!');
  };

  const handleEditSlot = (slot) => {
    setEditingSlotId(slot.id);
    setSlotForm({
      label: slot.label,
      start_time: slot.start_time,
      end_time: slot.end_time,
      max_orders: slot.max_orders || settings.max_orders_per_slot || 15,
      is_active: slot.is_active !== false,
    });
    setIsAddingSlot(true);
  };

  const handleDeleteSlot = (id) => {
    setSettings(prev => ({
      ...prev,
      time_slots_json: (prev.time_slots_json || []).filter(s => s.id !== id)
    }));
    toast.success('Time slot removed.');
  };

  const handleToggleSlotActive = (id) => {
    setSettings(prev => ({
      ...prev,
      time_slots_json: (prev.time_slots_json || []).map(s => s.id === id ? { ...s, is_active: !s.is_active } : s)
    }));
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
      if (emailSettings.app_password && emailSettings.app_password.trim()) {
        payload.app_password = emailSettings.app_password.trim();
      }

      const res = await api.patch('/store/email-settings/', payload);
      setEmailSettings(prev => ({
        ...prev,
        ...res.data,
        app_password: '',
      }));
      toast.success('Store Email & SMTP credentials saved!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to save email settings.');
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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
        auto_accept_orders: Boolean(settings.auto_accept_orders),
        show_popular_picks: Boolean(settings.show_popular_picks),
        popular_picks_title: settings.popular_picks_title?.trim() || 'Popular picks',
        show_great_deals: Boolean(settings.show_great_deals),
        great_deals_title: settings.great_deals_title?.trim() || 'Great Deals',
        show_new_arrivals: Boolean(settings.show_new_arrivals),
        new_arrivals_title: settings.new_arrivals_title?.trim() || 'New Arrivals',

        // UPI QR & Payment Management
        upi_id: settings.upi_id?.trim() || '',
        upi_payee_name: settings.upi_payee_name?.trim() || settings.payee_name?.trim() || 'Narendra Kirana',
        payee_name: settings.upi_payee_name?.trim() || settings.payee_name?.trim() || 'Narendra Kirana',
        enable_dynamic_upi_qr: Boolean(settings.enable_dynamic_upi_qr),

        // Legal & Compliance
        fssai_license_number: (settings.fssai_license_number || '').trim().replace(/[^0-9]/g, '').slice(0, 14),
        gstin: (settings.gstin || '').trim().toUpperCase().slice(0, 15),
        enable_itemized_tax_invoice: Boolean(settings.enable_itemized_tax_invoice),
        invoice_terms_and_conditions: settings.invoice_terms_and_conditions?.trim() || settings.terms_and_conditions?.trim() || '',
        terms_and_conditions: settings.invoice_terms_and_conditions?.trim() || settings.terms_and_conditions?.trim() || '',

        // Store Timings & Emergency Pause
        is_emergency_paused: Boolean(settings.is_emergency_paused),
        emergency_pause_message: settings.emergency_pause_message?.trim() || '',
        auto_cutoff_orders: Boolean(settings.auto_cutoff_orders),
        store_timings_json: settings.store_timings_json,
        operating_hours: settings.store_timings_json,

        // Delivery & Pickup Time Slots
        enable_time_slots: Boolean(settings.enable_time_slots),
        preparation_buffer_minutes: parseInt(settings.preparation_buffer_minutes, 10) || 30,
        max_orders_per_slot: parseInt(settings.max_orders_per_slot, 10) || 15,
        time_slots_json: settings.time_slots_json,
        time_slots: settings.time_slots_json,

        // WhatsApp Support Quick-Connect
        enable_whatsapp_support: Boolean(settings.enable_whatsapp_support),
        whatsapp_number: settings.whatsapp_number?.trim() || settings.whatsapp_phone_number?.trim() || '',
        whatsapp_phone_number: settings.whatsapp_number?.trim() || settings.whatsapp_phone_number?.trim() || '',
        whatsapp_default_message: settings.whatsapp_default_message?.trim() || '',
        whatsapp_order_help_template: settings.whatsapp_order_help_template?.trim() || '',

        // Loyalty Wallet & Referral Rules
        referral_bonus_referrer: (parseFloat(settings.referral_bonus_referrer) || 0).toFixed(2),
        referral_bonus_referee: (parseFloat(settings.referral_bonus_referee) || 0).toFixed(2),
        referral_min_order_amount: (parseFloat(settings.referral_min_order_amount) || 0).toFixed(2),
        max_wallet_usage_percentage: Math.min(100, Math.max(0, parseInt(settings.max_wallet_usage_percentage, 10) || 0)),
        order_cashback_percentage: (parseFloat(settings.order_cashback_percentage) || 0).toFixed(2),

        // Announcement Marquee & Festive Popup
        enable_announcement_bar: Boolean(settings.enable_announcement_bar),
        announcement_text: settings.announcement_text?.trim() || '',
        announcement_bg_color: settings.announcement_bg_color || '#ef4444',
        announcement_text_color: settings.announcement_text_color || '#ffffff',
        announcement_start_date: settings.announcement_start_date || null,
        announcement_end_date: settings.announcement_end_date || null,
        enable_festive_popup: Boolean(settings.enable_festive_popup),
        festive_popup_title: settings.festive_popup_title?.trim() || '',
        festive_popup_content: settings.festive_popup_content?.trim() || '',

        // Mobile App Version & Maintenance
        min_mobile_version: settings.min_mobile_version?.trim() || '1.0.0',
        latest_mobile_version: settings.latest_mobile_version?.trim() || '1.0.0',
        force_app_update: Boolean(settings.force_app_update),
        app_update_url: settings.app_update_url?.trim() || '',
        app_update_message: settings.app_update_message?.trim() || '',
        is_maintenance_mode: Boolean(settings.is_maintenance_mode),
        maintenance_message: settings.maintenance_message?.trim() || '',
        maintenance_estimated_end: settings.maintenance_estimated_end || null,
      };

      const hasFiles = Boolean(signatureFile || upiQrFile || festiveImageFile);
      let savePromise;

      if (hasFiles) {
        const formData = new FormData();
        Object.entries(payload).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            if (typeof val === 'object') {
              formData.append(key, JSON.stringify(val));
            } else {
              formData.append(key, val);
            }
          }
        });

        if (signatureFile) {
          formData.append('invoice_signature', signatureFile);
        }
        if (upiQrFile) {
          formData.append('upi_qr_image', upiQrFile);
          formData.append('upi_qr_standee', upiQrFile);
        }
        if (festiveImageFile) {
          formData.append('festive_popup_image', festiveImageFile);
        }

        // Axios/browser sets boundary automatically when Content-Type is not hardcoded
        savePromise = api.patch('/store/settings/', formData);
      } else {
        savePromise = api.patch('/store/settings/', payload);
      }

      toast.promise(savePromise, {
        loading: hasFiles ? 'Uploading images & saving...' : 'Saving store settings...',
        success: 'Settings updated successfully!',
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
      setUpiQrFile(null);
      setFestiveImageFile(null);
      fetchSettings();
    } catch (err) {
      console.error('Settings save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyUpiId = () => {
    if (settings.upi_id) {
      navigator.clipboard.writeText(settings.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
      toast.success('UPI ID copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center text-slate-500 gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="font-semibold text-sm">Loading store configuration...</span>
      </div>
    );
  }

  const isFssaiValid = (settings.fssai_license_number || '').trim().length === 14;
  const isGstinValid = (settings.gstin || '').trim().length === 15;

  return (
    <div className="max-w-6xl mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner Alerts (Emergency Pause / Maintenance / Closed) */}
      {settings.is_emergency_paused && (
        <div className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between gap-4 border border-rose-600 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">Emergency Store Pause Active</h3>
              <p className="text-xs text-rose-100">{settings.emergency_pause_message || 'Store ordering is currently paused for all customers.'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, is_emergency_paused: false }))}
            className="px-4 py-2 bg-white text-rose-700 font-bold text-xs rounded-xl shadow hover:bg-rose-50 transition shrink-0"
          >
            Resume Store Orders
          </button>
        </div>
      )}

      {settings.is_maintenance_mode && (
        <div className="bg-amber-500 text-slate-900 p-4 rounded-2xl shadow flex items-center justify-between gap-4 border border-amber-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/30 rounded-xl">
              <Power className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">System Maintenance Mode Active</h3>
              <p className="text-xs text-amber-950">{settings.maintenance_message || 'Customer app and web catalog are in maintenance mode.'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, is_maintenance_mode: false }))}
            className="px-4 py-2 bg-slate-900 text-amber-300 font-bold text-xs rounded-xl shadow hover:bg-black transition shrink-0"
          >
            Disable Maintenance
          </button>
        </div>
      )}

      {/* Header & Global Quick Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Store Settings & Operations</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${settings.is_open && !settings.is_emergency_paused ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
              {settings.is_emergency_paused ? 'Paused' : settings.is_open ? 'Open for Orders' : 'Store Closed'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your UPI QR payments, legal FSSAI/GSTIN compliance, delivery slots, wallet loyalty, and app controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ========================================================================= */}
        {/* TAB 1: General Store Operations */}
        {/* ========================================================================= */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Identity & Status */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Store className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Store Identity & Live Status</h2>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Store Public Name</label>
                    <input
                      type="text"
                      name="store_name"
                      value={settings.store_name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Narendra Kirana Store"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Support Email</label>
                    <input
                      type="email"
                      name="store_email"
                      value={settings.store_email}
                      onChange={handleChange}
                      placeholder="support@narendrakirana.in"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Store Contact Phone</label>
                    <input
                      type="text"
                      name="store_phone"
                      value={settings.store_phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Physical Store Address</label>
                    <input
                      type="text"
                      name="store_address"
                      value={settings.store_address}
                      onChange={handleChange}
                      placeholder="123 Market Street, City Center"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* Open/Close Master Switch */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Store Open for Orders</span>
                    <span className="text-xs text-slate-500">Toggle OFF to temporarily stop new orders from both mobile app and web.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      name="is_open"
                      checked={settings.is_open}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Constraints & Automation */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">Order Constraints & Inventory Automation</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_order_amount"
                    value={settings.min_order_amount}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Subtotal must meet this to checkout.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Flat Packaging Fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="packaging_fee"
                    value={settings.packaging_fee}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Added to all orders automatically.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Low Stock Threshold</label>
                  <input
                    type="number"
                    name="low_stock_threshold"
                    value={settings.low_stock_threshold}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Highlighted in red when stock is below this.</p>
                </div>

                <div className="md:col-span-3 flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Auto-Accept New Orders</span>
                    <span className="text-xs text-slate-500">Automatically move incoming orders from NEW to ACCEPTED status.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      name="auto_accept_orders"
                      checked={settings.auto_accept_orders}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Homepage Catalog Visibility */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">Homepage Sections Display</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">Popular Picks</span>
                      <input
                        type="checkbox"
                        name="show_popular_picks"
                        checked={settings.show_popular_picks}
                        onChange={handleChange}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <input
                      type="text"
                      name="popular_picks_title"
                      value={settings.popular_picks_title}
                      onChange={handleChange}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">Great Deals</span>
                      <input
                        type="checkbox"
                        name="show_great_deals"
                        checked={settings.show_great_deals}
                        onChange={handleChange}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <input
                      type="text"
                      name="great_deals_title"
                      value={settings.great_deals_title}
                      onChange={handleChange}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase">New Arrivals</span>
                      <input
                        type="checkbox"
                        name="show_new_arrivals"
                        checked={settings.show_new_arrivals}
                        onChange={handleChange}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>
                    <input
                      type="text"
                      name="new_arrivals_title"
                      value={settings.new_arrivals_title}
                      onChange={handleChange}
                      className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: UPI QR & Payment Management */}
        {/* ========================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <QrCode className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Store UPI QR & Digital Payment Setup</h2>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Instant Settlement (Zero MDR)
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Form Fields */}
                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Merchant UPI ID / VPA</label>
                        {settings.upi_id && (
                          <button
                            type="button"
                            onClick={copyUpiId}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedUpi ? 'Copied' : 'Copy VPA'}
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        name="upi_id"
                        value={settings.upi_id || ''}
                        onChange={handleChange}
                        placeholder="e.g. narendrakirana@okaxis or store@icici"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Must be a valid UPI handle (e.g. yourstore@okaxis, yourstore@upi, mobile@paytm).
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Payee Registered Name</label>
                      <input
                        type="text"
                        name="upi_payee_name"
                        value={settings.upi_payee_name || settings.payee_name || ''}
                        onChange={(e) => {
                          handleChange(e);
                          setSettings(prev => ({ ...prev, payee_name: e.target.value }));
                        }}
                        placeholder="e.g. Narendra Kirana Store"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Displayed to customers on GPay, PhonePe, and Paytm payment screens.</p>
                    </div>

                    {/* Dynamic QR Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-sm font-bold text-slate-900 block">Dynamic Amount UPI QR</span>
                        <span className="text-xs text-slate-500">
                          Automatically generates custom QR code with the exact order total encoded at checkout.
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          name="enable_dynamic_upi_qr"
                          checked={settings.enable_dynamic_upi_qr}
                          onChange={handleChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                        Store Counter QR Standee Image
                      </label>
                      <ImageCropper
                        aspect={1}
                        currentImageUrl={settings.upi_qr_image || settings.upi_qr_standee}
                        label="Upload Standee QR Code"
                        onCropComplete={(file) => setUpiQrFile(file)}
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Upload your physical store's standee QR (PhonePe, Google Pay, BharatPe, Paytm).</p>
                    </div>
                  </div>

                  {/* Right Column: Live Standee Preview Card */}
                  <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 rounded-2xl border border-indigo-100">
                    <div className="w-64 bg-white rounded-2xl shadow-lg border-2 border-indigo-500 p-5 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 inset-x-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider py-1">
                        Smart Kirana Instant UPI Pay
                      </div>

                      <div className="mt-4 mb-2">
                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                          {settings.upi_payee_name || settings.store_name || 'Narendra Kirana'}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 break-all">
                          {settings.upi_id || 'store@upi'}
                        </p>
                      </div>

                      <div className="w-40 h-40 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center my-2 p-2 overflow-hidden shadow-inner">
                        {settings.upi_qr_image || settings.upi_qr_standee ? (
                          <img
                            src={settings.upi_qr_image || settings.upi_qr_standee}
                            alt="UPI QR Standee"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-3 text-slate-400">
                            <QrCode className="w-12 h-12 mx-auto text-slate-300 mb-1" />
                            <span className="text-[10px] block font-semibold">No QR Uploaded</span>
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 mt-1">
                        <span>BHIM UPI</span> • <span>GPay</span> • <span>PhonePe</span> • <span>Paytm</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 mt-3 font-medium">Live Customer Counter Standee Preview</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: Legal & Compliance */}
        {/* ========================================================================= */}
        {activeTab === 'legal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">Legal & Statutory Compliance (FSSAI & GSTIN)</h2>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* FSSAI 14-Digit License */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        14-Digit FSSAI License Number
                      </label>
                      {isFssaiValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Verified 14 Digits
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          {(settings.fssai_license_number || '').length}/14 digits
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={14}
                      name="fssai_license_number"
                      value={settings.fssai_license_number || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setSettings(prev => ({ ...prev, fssai_license_number: val }));
                      }}
                      placeholder="e.g. 10020042000123"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono tracking-wider outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Mandatory for food business operators under Food Safety and Standards Act. Printed prominently on customer tax invoices.
                    </p>
                  </div>

                  {/* 15-Character GSTIN */}
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        15-Character GSTIN
                      </label>
                      {isGstinValid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          Valid GST Format
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500">
                          {(settings.gstin || '').length}/15 chars
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={15}
                      name="gstin"
                      value={settings.gstin || ''}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSettings(prev => ({ ...prev, gstin: val }));
                      }}
                      placeholder="e.g. 37AAAAA0000A1Z5"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono tracking-widest uppercase outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Format: 2-digit State Code + 10-char PAN + 1-char Entity Code + Z + 1-char Checksum.
                    </p>
                  </div>
                </div>

                {/* Itemized Tax Breakdown Toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Itemized GST Breakdown on Invoices</span>
                    <span className="text-xs text-slate-500">
                      Print granular CGST and SGST rates and amounts on customer invoices and PDF downloads.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      name="enable_itemized_tax_invoice"
                      checked={settings.enable_itemized_tax_invoice}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Invoice Terms & Return Policy */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Invoice Terms & Return Policy (Printed on Invoice Footer)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        invoice_terms_and_conditions: '1. Goods once sold will not be taken back without original bill.\n2. In case of any dispute, local jurisdiction applies.\n3. Perishable goods must be reported within 24 hours of delivery.\n4. Smart Kirana reserve right to substitute out-of-stock items upon customer confirmation.'
                      }))}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Load Standard Kirana Terms
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    name="invoice_terms_and_conditions"
                    value={settings.invoice_terms_and_conditions || settings.terms_and_conditions || ''}
                    onChange={(e) => {
                      handleChange(e);
                      setSettings(prev => ({ ...prev, terms_and_conditions: e.target.value }));
                    }}
                    placeholder="Enter custom terms and return policy line by line..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs font-mono leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Each line is formatted as a policy clause on printed A4 and mobile PDF bills.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: Store Timings & Emergency Pause */}
        {/* ========================================================================= */}
        {activeTab === 'timings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1-Click Emergency Pause Card */}
            <div className={`p-6 rounded-2xl border transition-all ${
              settings.is_emergency_paused 
                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400' 
                : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${settings.is_emergency_paused ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-100 text-rose-600'}`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">1-Click Emergency Store Pause</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Instantly pause checkout across web and mobile app with a custom banner without changing weekly operating schedule.
                    </p>
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
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Emergency Notice Banner Message</label>
                <input
                  type="text"
                  name="emergency_pause_message"
                  value={settings.emergency_pause_message || ''}
                  onChange={handleChange}
                  placeholder="We are temporarily not taking new orders due to heavy rush. We will resume shortly!"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>
            </div>

            {/* Auto Cut-Off & Weekly Schedule */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Weekly Operating Hours</h2>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMondayToWeekdays}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 cursor-pointer"
                >
                  Copy Monday Hours to All Weekdays
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Auto cut-off orders */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Auto Order Cut-Off</span>
                    <span className="text-xs text-slate-500">Automatically stop accepting orders 30 minutes before store closing time.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      name="auto_cutoff_orders"
                      checked={settings.auto_cutoff_orders}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                {/* Day-by-Day Grid */}
                <div className="divide-y divide-slate-100">
                  {DAYS_OF_WEEK.map(day => {
                    const timing = settings.store_timings_json?.[day.key] || { open: '08:00', close: '21:30', is_closed: false };
                    return (
                      <div key={day.key} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="w-32">
                          <span className="text-sm font-bold text-slate-900">{day.label}</span>
                          <span className={`block text-[11px] font-semibold ${timing.is_closed ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {timing.is_closed ? 'Closed all day' : 'Open for business'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 flex-1 sm:justify-end">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer mr-4">
                            <input
                              type="checkbox"
                              checked={Boolean(timing.is_closed)}
                              onChange={(e) => handleTimingChange(day.key, 'is_closed', e.target.checked)}
                              className="rounded text-rose-600 focus:ring-rose-500"
                            />
                            <span>Closed Today</span>
                          </label>

                          {!timing.is_closed && (
                            <div className="flex items-center gap-2 animate-in fade-in">
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Open</span>
                                <input
                                  type="time"
                                  value={timing.open || '08:00'}
                                  onChange={(e) => handleTimingChange(day.key, 'open', e.target.value)}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono bg-white"
                                />
                              </div>
                              <span className="text-slate-400 mt-3">—</span>
                              <div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase block">Close</span>
                                <input
                                  type="time"
                                  value={timing.close || '21:30'}
                                  onChange={(e) => handleTimingChange(day.key, 'close', e.target.value)}
                                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono bg-white"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: Delivery & Pickup Time Slots */}
        {/* ========================================================================= */}
        {activeTab === 'slots' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Delivery & Pickup Slot Management</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_time_slots"
                    checked={settings.enable_time_slots}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-6 space-y-6">
                {/* Buffer and Cap configs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Preparation Buffer Time (Minutes)
                    </label>
                    <input
                      type="number"
                      name="preparation_buffer_minutes"
                      value={settings.preparation_buffer_minutes}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Slots starting earlier than this buffer from now are blocked at checkout.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Max Orders Cap Per Slot
                    </label>
                    <input
                      type="number"
                      name="max_orders_per_slot"
                      value={settings.max_orders_per_slot}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Prevents store packing backlog during peak hours.</p>
                  </div>
                </div>

                {/* Slot Builder */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Configured Time Windows</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setSlotForm({ label: '', start_time: '09:00', end_time: '12:00', max_orders: settings.max_orders_per_slot || 15, is_active: true });
                        setEditingSlotId(null);
                        setIsAddingSlot(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Slot</span>
                    </button>
                  </div>

                  {/* Add / Edit Form Modal or Inline Card */}
                  {isAddingSlot && (
                    <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-900 uppercase">
                          {editingSlotId ? 'Edit Time Slot' : 'Create Time Slot'}
                        </span>
                        <button type="button" onClick={() => setIsAddingSlot(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Slot Label</label>
                          <input
                            type="text"
                            value={slotForm.label}
                            onChange={(e) => setSlotForm(prev => ({ ...prev, label: e.target.value }))}
                            placeholder="e.g. Morning Express"
                            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={slotForm.start_time}
                            onChange={(e) => setSlotForm(prev => ({ ...prev, start_time: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">End Time</label>
                          <input
                            type="time"
                            value={slotForm.end_time}
                            onChange={(e) => setSlotForm(prev => ({ ...prev, end_time: e.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingSlot(false)}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSlot}
                          className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer"
                        >
                          {editingSlotId ? 'Save Changes' : 'Add Slot'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Slot list */}
                  <div className="space-y-2">
                    {(settings.time_slots_json || []).map((slot, index) => (
                      <div
                        key={slot.id || index}
                        className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                          slot.is_active !== false ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200/60 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleSlotActive(slot.id)}
                            className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                              slot.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {slot.is_active !== false ? 'Active' : 'Inactive'}
                          </button>
                          <div>
                            <span className="font-bold text-sm text-slate-900">{slot.label}</span>
                            <span className="text-xs text-slate-500 font-mono block">
                              {slot.start_time} — {slot.end_time} (Max orders: {slot.max_orders || settings.max_orders_per_slot || 15})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditSlot(slot)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: Home Delivery Rules */}
        {/* ========================================================================= */}
        {activeTab === 'delivery' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Home Delivery Logistics & Fee Rules</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="is_home_delivery_active"
                    checked={settings.is_home_delivery_active}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Standard Delivery Fee (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="delivery_fee"
                      value={settings.delivery_fee}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Charged per order when below free threshold.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Free Delivery Threshold (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="free_delivery_threshold"
                      value={settings.free_delivery_threshold}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Delivery fee is waived above this cart amount.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Min Order for Delivery (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="min_delivery_order_amount"
                      value={settings.min_delivery_order_amount}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Minimum subtotal required to select delivery.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Allowed Delivery Pincodes
                  </label>
                  <textarea
                    rows={3}
                    name="allowed_pincodes"
                    value={settings.allowed_pincodes || ''}
                    onChange={handleChange}
                    placeholder="e.g. 530001, 530002, 530004, 530016"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Comma-separated list of serviceable pincodes. Leave blank to accept home deliveries anywhere in your region.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: WhatsApp Support Quick-Connect */}
        {/* ========================================================================= */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-bold text-slate-900 text-base">WhatsApp Support & Customer Quick-Connect</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_whatsapp_support"
                    checked={settings.enable_whatsapp_support}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        WhatsApp Business Phone Number
                      </label>
                      <input
                        type="text"
                        name="whatsapp_number"
                        value={settings.whatsapp_number || settings.whatsapp_phone_number || ''}
                        onChange={(e) => {
                          handleChange(e);
                          setSettings(prev => ({ ...prev, whatsapp_phone_number: e.target.value }));
                        }}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">Include country code (+91 for India).</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Default Greeting Message
                      </label>
                      <input
                        type="text"
                        name="whatsapp_default_message"
                        value={settings.whatsapp_default_message || ''}
                        onChange={handleChange}
                        placeholder="Hi Narendra Kirana, I have a question about products."
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Order Help Template (Auto-populated from Order Details)
                      </label>
                      <input
                        type="text"
                        name="whatsapp_order_help_template"
                        value={settings.whatsapp_order_help_template || ''}
                        onChange={handleChange}
                        placeholder="Hi Narendra Kirana, I need help with Order #{order_id}"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                      <p className="text-[11px] text-slate-500 mt-1">
                        Use <code className="text-emerald-700 font-mono font-bold">{'{order_id}'}</code> tag to auto-insert the customer's order ID.
                      </p>
                    </div>
                  </div>

                  {/* Live Chat Mockup Preview */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                          NK
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900">{settings.store_name || 'Narendra Kirana'}</div>
                          <div className="text-[10px] text-emerald-600 font-semibold">Online • WhatsApp Support</div>
                        </div>
                      </div>

                      <div className="my-4 space-y-2.5">
                        <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%] text-xs text-slate-800 border border-slate-100">
                          {settings.whatsapp_default_message || 'Hi Narendra Kirana, I need help with my grocery order.'}
                        </div>
                        <div className="bg-emerald-50 p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[85%] ml-auto text-xs text-emerald-950 border border-emerald-100">
                          {(settings.whatsapp_order_help_template || '').replace('{order_id}', '1024')}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 text-center">
                      Floating WhatsApp help button is embedded on Customer Checkout, Order Details, and Help screens.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: Loyalty Wallet & Referral Rules */}
        {/* ========================================================================= */}
        {activeTab === 'loyalty' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Gift className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">Customer Loyalty Wallet & Referral Program Rules</h2>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Referrer Reward (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="referral_bonus_referrer"
                      value={settings.referral_bonus_referrer}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Credited to existing user's wallet.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Referee Welcome Bonus (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="referral_bonus_referee"
                      value={settings.referral_bonus_referee}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Credited to newly referred user upon sign-up.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Min Order Spend to Activate (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="referral_min_order_amount"
                      value={settings.referral_min_order_amount}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Referee must spend this to release referrer bonus.</p>
                  </div>
                </div>

                {/* Sliders for Wallet Usage & Cashback */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Max Wallet Usage Per Order
                      </label>
                      <span className="text-sm font-black text-indigo-600">
                        {settings.max_wallet_usage_percentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      name="max_wallet_usage_percentage"
                      value={settings.max_wallet_usage_percentage}
                      onChange={handleChange}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">
                      Cap on what percentage of an order total can be settled using wallet balance (e.g. 50% ensures at least half is paid via UPI/cash).
                    </p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        Order Cashback Percentage
                      </label>
                      <span className="text-sm font-black text-emerald-600">
                        {settings.order_cashback_percentage}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      name="order_cashback_percentage"
                      value={settings.order_cashback_percentage}
                      onChange={handleChange}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500">
                      Credited automatically to customer wallet upon completion of each non-cancelled order.
                    </p>
                  </div>
                </div>

                {/* Live Simulation Card */}
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900">
                      Sample Calculation on ₹1,000 Order:
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-indigo-800 space-x-3">
                    <span>
                      Max wallet discount: <strong>₹{(1000 * (settings.max_wallet_usage_percentage || 50) / 100).toFixed(0)}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Cashback earned: <strong>₹{(1000 * (parseFloat(settings.order_cashback_percentage) || 2) / 100).toFixed(0)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: Announcements & Festive Popup */}
        {/* ========================================================================= */}
        {activeTab === 'announcements' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Announcement Marquee Ticker */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Top Scrolling Announcement Bar</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_announcement_bar"
                    checked={settings.enable_announcement_bar}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Marquee Ticker Text
                  </label>
                  <input
                    type="text"
                    name="announcement_text"
                    value={settings.announcement_text || ''}
                    onChange={handleChange}
                    placeholder="e.g. 🎉 Free Delivery on all orders above ₹499! Special Weekend Sale Live."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Background Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="announcement_bg_color"
                        value={settings.announcement_bg_color || '#ef4444'}
                        onChange={handleChange}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        name="announcement_bg_color"
                        value={settings.announcement_bg_color || '#ef4444'}
                        onChange={handleChange}
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        name="announcement_text_color"
                        value={settings.announcement_text_color || '#ffffff'}
                        onChange={handleChange}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                      />
                      <input
                        type="text"
                        name="announcement_text_color"
                        value={settings.announcement_text_color || '#ffffff'}
                        onChange={handleChange}
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-2.5 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Start Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="announcement_start_date"
                      value={settings.announcement_start_date ? settings.announcement_start_date.split('T')[0] : ''}
                      onChange={handleChange}
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      name="announcement_end_date"
                      value={settings.announcement_end_date ? settings.announcement_end_date.split('T')[0] : ''}
                      onChange={handleChange}
                      className="w-full text-xs rounded-lg border border-slate-300 px-2.5 py-2 bg-white"
                    />
                  </div>
                </div>

                {/* Live Preview Ticker */}
                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Live Ticker Preview</span>
                  <div
                    style={{
                      backgroundColor: settings.announcement_bg_color || '#ef4444',
                      color: settings.announcement_text_color || '#ffffff',
                    }}
                    className="p-3 rounded-xl shadow-sm text-center font-bold text-xs overflow-hidden whitespace-nowrap"
                  >
                    <span className="inline-block animate-pulse">{settings.announcement_text || 'Announcement Text Preview'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Festive Popup Modal Config */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-slate-900 text-base">Festive & Seasonal Modal Popup</h2>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="enable_festive_popup"
                    checked={settings.enable_festive_popup}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Festive Popup Title
                      </label>
                      <input
                        type="text"
                        name="festive_popup_title"
                        value={settings.festive_popup_title || ''}
                        onChange={handleChange}
                        placeholder="e.g. Happy Diwali / Festive Greetings! 🪔"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Festive Announcement Content
                      </label>
                      <textarea
                        rows={3}
                        name="festive_popup_content"
                        value={settings.festive_popup_content || ''}
                        onChange={handleChange}
                        placeholder="Celebrate with exclusive festival hampers, sweets, and express doorstep delivery!"
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowFestivePreview(true)}
                      className="px-4 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-amber-100 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Preview Festive Popup Dialog</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                      Festive Banner Graphic (16:9)
                    </label>
                    <ImageCropper
                      aspect={16 / 9}
                      currentImageUrl={settings.festive_popup_image}
                      label="Upload Festive Banner"
                      onCropComplete={(file) => setFestiveImageFile(file)}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">High-resolution banner displayed inside the customer modal.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 10: Mobile App Version & Maintenance Control */}
        {/* ========================================================================= */}
        {activeTab === 'app_version' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Whole Store Maintenance Mode */}
            <div className={`p-6 rounded-2xl border transition-all ${
              settings.is_maintenance_mode 
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' 
                : 'bg-white border-slate-100 shadow-sm'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl ${settings.is_maintenance_mode ? 'bg-amber-500 text-slate-900' : 'bg-amber-100 text-amber-700'}`}>
                    <Power className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Whole-Store Maintenance Mode</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Show an offline maintenance screen on both Android/iOS apps and web store during server maintenance or inventory audits.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    name="is_maintenance_mode"
                    checked={settings.is_maintenance_mode}
                    onChange={handleChange}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-200/60">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Maintenance Announcement Message
                  </label>
                  <input
                    type="text"
                    name="maintenance_message"
                    value={settings.maintenance_message || ''}
                    onChange={handleChange}
                    placeholder="We are currently performing scheduled upgrades. We will be back shortly!"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Estimated Completion Time
                  </label>
                  <input
                    type="text"
                    name="maintenance_estimated_end"
                    value={settings.maintenance_estimated_end || ''}
                    onChange={handleChange}
                    placeholder="e.g. Back online by 11:30 PM IST"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Mobile App Versioning & Force Update */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-slate-900 text-base">Mobile App Version Enforcement (OTA & Store)</h2>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                  Android APK & Play Store
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Minimum Required App Version
                    </label>
                    <input
                      type="text"
                      name="min_mobile_version"
                      value={settings.min_mobile_version || '1.0.0'}
                      onChange={handleChange}
                      placeholder="1.0.0"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Users below this version are forced to update.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Latest Published App Version
                    </label>
                    <input
                      type="text"
                      name="latest_mobile_version"
                      value={settings.latest_mobile_version || '1.0.0'}
                      onChange={handleChange}
                      placeholder="1.1.0"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Recommended version shown in app prompts.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Force Immediate Update
                    </label>
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-0.5">
                      <span className="text-xs font-semibold text-slate-700">Hard Block App</span>
                      <input
                        type="checkbox"
                        name="force_app_update"
                        checked={settings.force_app_update}
                        onChange={handleChange}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Play Store / App Download URL
                    </label>
                    <input
                      type="url"
                      name="app_update_url"
                      value={settings.app_update_url || ''}
                      onChange={handleChange}
                      placeholder="https://play.google.com/store/apps/details?id=com.narendrakirana.app"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Update Prompt Announcement Message
                    </label>
                    <input
                      type="text"
                      name="app_update_message"
                      value={settings.app_update_message || ''}
                      onChange={handleChange}
                      placeholder="A mandatory update is available with new features and critical security enhancements."
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 11: Invoicing & Digital Signature */}
        {/* ========================================================================= */}
        {activeTab === 'invoicing' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-slate-900 text-base">Invoice Header & Digital Signature</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Store Address on Invoice</label>
                    <textarea
                      name="store_address"
                      value={settings.store_address || ''}
                      onChange={handleChange}
                      rows={2}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="e.g. 123 Market Street, City Center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Contact Number on Invoice</label>
                    <input
                      type="text"
                      name="store_phone"
                      value={settings.store_phone || ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Support Email on Invoice</label>
                    <input
                      type="email"
                      name="store_email"
                      value={settings.store_email || ''}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="support@narendrakirana.in"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Authorized Signatory Digital Signature
                  </label>
                  <ImageCropper
                    aspect={2.5 / 1}
                    currentImageUrl={settings.invoice_signature}
                    label="Upload Signature"
                    onCropComplete={(file) => setSignatureFile(file)}
                  />
                  <p className="text-[11px] text-slate-500 mt-2">
                    A white or transparent background signature image is recommended. Rendered in invoice footer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 12: Email & SMTP Configuration */}
        {/* ========================================================================= */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Mail className="w-5 h-5"/>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Email & App Password (SMTP)</h2>
                    <p className="text-xs text-slate-500">Configure outgoing email and 16-character Google App Password without code changes</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${emailSettings.is_active && emailSettings.has_password ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${emailSettings.is_active && emailSettings.has_password ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {emailSettings.is_active && emailSettings.has_password ? 'Active (Custom SMTP)' : 'Server Default (.env)'}
                </span>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="pr-4">
                    <span className="text-sm font-bold text-slate-900 block">Enable Dynamic Store Email</span>
                    <span className="text-xs text-slate-500">When enabled, order confirmations, invoice emails, password resets, and account activations will be sent from this email address.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      name="is_active" 
                      checked={emailSettings.is_active} 
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, is_active: e.target.checked }))} 
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email Service Provider</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectProvider('gmail')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${emailSettings.provider === 'gmail' ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>Gmail / Google</span>
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Recommended</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">smtp.gmail.com (Port 587)</div>
                      </div>
                      {emailSettings.provider === 'gmail' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectProvider('outlook')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${emailSettings.provider === 'outlook' ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900">Outlook / Office 365</div>
                        <div className="text-xs text-slate-500 mt-0.5">smtp.office365.com (Port 587)</div>
                      </div>
                      {emailSettings.provider === 'outlook' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectProvider('custom')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${emailSettings.provider === 'custom' ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900">Custom SMTP</div>
                        <div className="text-xs text-slate-500 mt-0.5">SendGrid, Brevo, AWS SES, etc.</div>
                      </div>
                      {emailSettings.provider === 'custom' && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Sender Display Name</label>
                    <input 
                      type="text" 
                      value={emailSettings.sender_name} 
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_name: e.target.value }))} 
                      placeholder="e.g. Narendra Kirana"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Sender Email Address</label>
                    <input 
                      type="email" 
                      value={emailSettings.sender_email} 
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_email: e.target.value }))} 
                      placeholder="e.g. yourstore@gmail.com"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                        {emailSettings.provider === 'gmail' ? 'Google 16-Character App Password' : 'SMTP Password / API Secret'}
                      </label>
                      {emailSettings.has_password && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ Password saved securely
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type={showAppPassword ? 'text' : 'password'} 
                        value={emailSettings.app_password} 
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, app_password: e.target.value }))} 
                        placeholder={emailSettings.has_password ? '•••••••••••••••• (Leave blank to keep saved password)' : 'e.g. abcd efgh ijkl mnop'}
                        className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowAppPassword(!showAppPassword)} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showAppPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                      </button>
                    </div>
                  </div>

                  {emailSettings.provider === 'custom' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">SMTP Host</label>
                        <input 
                          type="text" 
                          value={emailSettings.smtp_host} 
                          onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_host: e.target.value }))} 
                          placeholder="e.g. smtp.sendgrid.net"
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">SMTP Port</label>
                        <input 
                          type="number" 
                          value={emailSettings.smtp_port} 
                          onChange={(e) => setEmailSettings(prev => ({ ...prev, smtp_port: e.target.value }))} 
                          placeholder="587"
                          className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Google App Password Guide Accordion */}
                {emailSettings.provider === 'gmail' && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setShowGoogleGuide(!showGoogleGuide)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between text-indigo-900 font-bold text-xs uppercase tracking-wider hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-indigo-600" />
                        How to generate a 16-digit Google App Password (Click to view guide)
                      </span>
                      {showGoogleGuide ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                    </button>

                    {showGoogleGuide && (
                      <div className="p-4 pt-0 border-t border-indigo-100/60 text-xs text-indigo-950 space-y-2 mt-2 leading-relaxed">
                        <p className="font-semibold text-indigo-900">Follow these 4 quick steps in your Google Account:</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-700">
                          <li>
                            Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">Google Account Security <ExternalLink size={11}/></a> and ensure <strong>2-Step Verification</strong> is turned ON.
                          </li>
                          <li>
                            In the search bar at the top, type <strong>"App passwords"</strong> (or visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">App Passwords <ExternalLink size={11}/></a>).
                          </li>
                          <li>
                            Give your app a name (e.g. <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-800 font-mono">Narendra Kirana</code>) and click <strong>Create</strong>.
                          </li>
                          <li>
                            Google displays a yellow box with a 16-character code (e.g. <code className="bg-white px-1.5 py-0.5 rounded border text-indigo-800 font-mono">abcd efgh ijkl mnop</code>). Copy that code and paste it into the App Password box above.
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500">
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
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-indigo-600"/>
                      <span>Send Test Email</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveEmailSettings}
                      disabled={savingEmail}
                      className="flex-1 sm:flex-none px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5"/>
                      <span>{savingEmail ? 'Saving...' : 'Save Email Credentials'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Floating/Bottom Action Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Current Section: <span className="font-bold text-slate-800">{TABS.find(t => t.id === activeTab)?.label}</span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

      {/* Test Email Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>Test SMTP Connection</span>
              </div>
              <button 
                type="button" 
                onClick={() => setTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              We will send a live verification email to check your sender address and 16-character Google App Password authentication.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Send Test Email To</label>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="yourname@gmail.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                disabled={testingEmail}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testingEmail}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow disabled:opacity-50 cursor-pointer"
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

      {/* Festive Popup Live Preview Modal */}
      {showFestivePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden relative">
            <button
              type="button"
              onClick={() => setShowFestivePreview(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {settings.festive_popup_image && (
              <img
                src={settings.festive_popup_image}
                alt="Festive Offer"
                className="w-full h-48 object-cover"
              />
            )}

            <div className="p-6 text-center space-y-3">
              <h3 className="text-xl font-black text-slate-900">
                {settings.festive_popup_title || 'Special Festive Offer! 🪔'}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {settings.festive_popup_content || 'Enjoy huge festive discounts on all grocery essentials.'}
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowFestivePreview(false)}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm rounded-xl shadow transition cursor-pointer"
                >
                  Shop Festival Offers Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
