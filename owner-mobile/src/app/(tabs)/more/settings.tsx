import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  Linking,
  Share,
} from 'react-native';
import ModernSwitch from '../../../components/ModernSwitch';
import ScreenHeader from '../../../components/ScreenHeader';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { theme, THEME_PRESETS } from '../../../constants/theme';
import { showAlert } from '../../../utils/alerts';

const normalizeHex = (hex: string, fallback = '#5ba8a6'): string => {
  if (!hex || typeof hex !== 'string') return fallback;
  const clean = hex.trim().replace(/[^0-9a-fA-F#]/g, '');
  const withHash = clean.startsWith('#') ? clean : `#${clean}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(withHash) ? withHash : fallback;
};

const CURATED_PALETTES = {
  primary: ['#5ba8a6', '#059669', '#4f46e5', '#f59e0b', '#e11d48', '#8b5cf6', '#0284c7', '#0f172a'],
  secondary: ['#4d69a5', '#10b981', '#6366f1', '#ef4444', '#f97316', '#3b82f6', '#14b8a6', '#475569'],
  accent: ['#ecd386', '#f59e0b', '#f97316', '#fbbf24', '#eab308', '#ec4899', '#10b981', '#06b6d4'],
  canvas: ['#f7f5f0', '#f8fafc', '#fffbeb', '#faf5ff', '#f0fdf4', '#f0f9ff', '#fff1f2', '#ffffff'],
  text: ['#323232', '#0f172a', '#1e293b', '#18181b', '#1c1917', '#111827', '#020617', '#27272a'],
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, refreshTheme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingTheme, setApplyingTheme] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  // Core settings form
  const [form, setForm] = useState<any>({
    store_name: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    store_latitude: '17.385044',
    store_longitude: '78.486671',
    is_open: true,
    auto_accept_orders: false,
    min_order_amount: '0.00',
    packaging_fee: '0.00',
    low_stock_threshold: '5',
    delivery_mode: 'BOTH',
    is_home_delivery_active: false,
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    min_delivery_order_amount: '150.00',
    allowed_pincodes: '',
    delivery_radius_km: '5.00',
    enforce_delivery_radius: false,
    popular_searches: '',
    invoice_signature: null,
    show_popular_picks: true,
    popular_picks_title: 'Popular picks',
    show_great_deals: true,
    great_deals_title: 'Great Deals',
    show_new_arrivals: true,
    new_arrivals_title: 'New Arrivals',
    brand_theme_preset: 'vacation',
    palette_mode: 5,
    custom_primary_color: '#5ba8a6',
    custom_secondary_color: '#4d69a5',
    custom_accent_color: '#ecd386',
    custom_canvas_color: '#eae6dd',
    custom_text_color: '#323232',
    apply_theme_to_owner_app: false,
  });

  const safePrimary = normalizeHex(form.custom_primary_color, '#5ba8a6');
  const safeSecondary = normalizeHex(form.custom_secondary_color, '#4d69a5');
  const safeAccent = normalizeHex(form.custom_accent_color, '#ecd386');
  const safeCanvas = normalizeHex(form.custom_canvas_color, '#eae6dd');
  const safeText = normalizeHex(form.custom_text_color, '#323232');

  const activePreset = THEME_PRESETS[form.brand_theme_preset || 'vacation'];
  const isCustomPreset = form.brand_theme_preset === 'custom';
  const previewPrimary = isCustomPreset ? safePrimary : (activePreset?.primary || safePrimary);
  const previewSecondary = isCustomPreset ? safeSecondary : (activePreset?.secondary || safeSecondary);
  const previewAccent = isCustomPreset ? safeAccent : (activePreset?.accent || safeAccent);
  const previewCanvas = isCustomPreset ? safeCanvas : (activePreset?.canvas || safeCanvas);
  const previewText = isCustomPreset ? safeText : (activePreset?.text || safeText);

  // Digital signature state
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [signatureChanged, setSignatureChanged] = useState(false);

  // Email & SMTP configuration state
  const [emailSettings, setEmailSettings] = useState<any>({
    provider: 'gmail',
    sender_name: 'Narendra Kirana',
    sender_email: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    use_tls: true,
    use_ssl: false,
    is_active: false,
    app_password: '',
  });
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  // Test email modal state
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [settingsRes, emailRes] = await Promise.allSettled([
          api.get('/store/settings/', { params: { t: Date.now() } }),
          api.get('/store/email-settings/', { params: { t: Date.now() } }),
        ]);

        if (!isMounted) return;

        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
          const d = settingsRes.value.data;
          setForm((prev: any) => ({
            ...prev,
            ...d,
            store_latitude: d.store_latitude ? String(d.store_latitude) : '17.385044',
            store_longitude: d.store_longitude ? String(d.store_longitude) : '78.486671',
            low_stock_threshold: String(d.low_stock_threshold ?? '5'),
            delivery_radius_km: String(d.delivery_radius_km ?? '5.00'),
            delivery_mode: d.delivery_mode || (d.is_home_delivery_active ? 'BOTH' : 'PICKUP'),
            popular_searches: d.popular_searches || '',
            palette_mode: d.palette_mode || 5,
            custom_canvas_color: d.custom_canvas_color || '#eae6dd',
            custom_text_color: d.custom_text_color || '#323232',
          }));
          if (d.invoice_signature) {
            setSignatureUri(d.invoice_signature);
          }
          if (d.store_email && !testRecipient) {
            setTestRecipient(d.store_email);
          }
        }

        if (emailRes.status === 'fulfilled' && emailRes.value?.data) {
          const em = emailRes.value.data;
          setEmailSettings((prev: any) => ({
            ...prev,
            ...em,
            sender_email: em.sender_email || prev.sender_email || '',
            app_password: em.app_password || em.masked_password || '',
          }));
          if (em.sender_email && !testRecipient) {
            setTestRecipient(em.sender_email);
          }
        }
      } catch (err) {
        console.error('Failed to load store settings:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (key: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [key]: val }));
  };

  const updateEmailField = (key: string, val: any) => {
    setEmailSettings((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSelectEmailProvider = (provider: 'gmail' | 'outlook' | 'custom') => {
    if (provider === 'gmail') {
      setEmailSettings((prev: any) => ({
        ...prev,
        provider: 'gmail',
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        use_tls: true,
        use_ssl: false,
      }));
    } else if (provider === 'outlook') {
      setEmailSettings((prev: any) => ({
        ...prev,
        provider: 'outlook',
        smtp_host: 'smtp.office365.com',
        smtp_port: 587,
        use_tls: true,
        use_ssl: false,
      }));
    } else {
      setEmailSettings((prev: any) => ({
        ...prev,
        provider: 'custom',
      }));
    }
  };

  const handlePickSignature = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          showAlert('Permission Required', 'Permission to access photo library is required.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [5, 2],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSignatureUri(result.assets[0].uri);
        setSignatureChanged(true);
      }
    } catch (err) {
      console.error('Signature pick error:', err);
    }
  };

  const handleRemoveSignature = () => {
    setSignatureUri(null);
    setSignatureChanged(true);
  };

  const handleQuickDownloadBackup = async () => {
    setDownloadingBackup(true);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const res = await api.get('/store/backup/export/', { responseType: 'blob' });
        const blob = new Blob([res.data], { type: 'application/json' });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const dateStr = new Date().toISOString().slice(0, 10);
        link.download = `narendra_kirana_backup_${dateStr}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        showAlert('Backup Complete', 'Complete store database backup downloaded successfully!');
      } else {
        const baseUrl = api.defaults.baseURL || 'https://narendra-kirana.onrender.com/api/v1';
        const exportUrl = `${baseUrl.replace(/\/+$/, '')}/store/backup/export/`;
        const res = await api.get('/store/backup/export/');
        const jsonStr = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
        const dateStr = new Date().toISOString().slice(0, 10);
        await Share.share({
          title: `narendra_kirana_backup_${dateStr}.json`,
          message: jsonStr,
        });
        if (false) await Linking.openURL(exportUrl);
        showAlert('Export Initiated', 'Database backup download opened in device browser.');
      }
    } catch (err) {
      showAlert('Backup Error', getErrorMessage(err, 'Failed to export store database backup.'));
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    setSavingEmail(true);
    try {
      const payload: any = {
        provider: emailSettings.provider,
        sender_email: String(emailSettings.sender_email || '').trim(),
        sender_name: String(emailSettings.sender_name || 'Narendra Kirana').trim(),
        smtp_host: String(emailSettings.smtp_host || 'smtp.gmail.com').trim(),
        smtp_port: Number(emailSettings.smtp_port) || 587,
        use_tls: Boolean(emailSettings.use_tls),
        use_ssl: Boolean(emailSettings.use_ssl),
        is_active: Boolean(emailSettings.is_active),
      };
      if (emailSettings.app_password !== undefined) {
        payload.app_password = String(emailSettings.app_password).trim();
      }

      const res = await api.patch('/store/email-settings/', payload);
      setEmailSettings((prev: any) => ({
        ...prev,
        ...res.data,
        app_password: res.data?.app_password || res.data?.masked_password || '',
      }));
      (api as ApiInstance).clearCache();
      showAlert('Success', 'Store Email & SMTP credentials saved!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save email settings.'));
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes('@')) {
      showAlert('Invalid Recipient', 'Please enter a valid recipient email address.');
      return;
    }
    setTestingEmail(true);
    try {
      const payload = {
        test_email: testRecipient.trim(),
        config_override: {
          provider: emailSettings.provider,
          sender_email: String(emailSettings.sender_email || '').trim(),
          sender_name: String(emailSettings.sender_name || 'Narendra Kirana').trim(),
          smtp_host: String(emailSettings.smtp_host || 'smtp.gmail.com').trim(),
          smtp_port: Number(emailSettings.smtp_port) || 587,
          use_tls: Boolean(emailSettings.use_tls),
          use_ssl: Boolean(emailSettings.use_ssl),
          app_password: emailSettings.app_password ? String(emailSettings.app_password).trim() : undefined,
        },
      };
      const res = await api.post('/store/email-settings/test/', payload);
      setTestModalOpen(false);
      showAlert('Delivered!', res.data?.message || 'Test email sent successfully!');
    } catch (e: any) {
      showAlert('Test Failed', getErrorMessage(e, 'Failed to send test email. Please check credentials.'));
    } finally {
      setTestingEmail(false);
    }
  };

  const handleApplyThemeOnly = async () => {
    setApplyingTheme(true);
    try {
      const payload = {
        brand_theme_preset: String(form.brand_theme_preset || 'vacation').trim(),
        palette_mode: parseInt(String(form.palette_mode || 5), 10) || 5,
        custom_primary_color: safePrimary,
        custom_secondary_color: safeSecondary,
        custom_accent_color: safeAccent,
        custom_canvas_color: safeCanvas,
        custom_text_color: safeText,
        apply_theme_to_owner_app: Boolean(form.apply_theme_to_owner_app),
      };

      const res = await api.patch('/store/settings/', payload);
      (api as ApiInstance).clearCache();
      try {
        await refreshTheme?.(res?.data || payload);
      } catch {}
      showAlert('Theme Published!', 'Store look and theme has been successfully published across customer storefronts and owner app.');
    } catch (e: any) {
      console.error('Failed to apply theme:', e);
      showAlert('Error', getErrorMessage(e, 'Failed to update store theme.'));
    } finally {
      setApplyingTheme(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload: any = {
        store_name: String(form.store_name || '').trim() || 'Narendra Kirana',
        store_address: String(form.store_address || '').trim(),
        store_phone: String(form.store_phone || '').trim().slice(0, 20),
        store_email: String(form.store_email || '').trim(),
        is_open: Boolean(form.is_open),
        auto_accept_orders: Boolean(form.auto_accept_orders),
        min_order_amount: (parseFloat(form.min_order_amount) || 0).toFixed(2),
        packaging_fee: (parseFloat(form.packaging_fee) || 0).toFixed(2),
        low_stock_threshold: Math.max(0, parseInt(form.low_stock_threshold, 10) || 5),
        delivery_mode: form.delivery_mode || (form.is_home_delivery_active ? 'BOTH' : 'PICKUP'),
        is_home_delivery_active: Boolean(form.is_home_delivery_active),
        delivery_fee: (parseFloat(form.delivery_fee) || 0).toFixed(2),
        free_delivery_threshold: (parseFloat(form.free_delivery_threshold) || 0).toFixed(2),
        min_delivery_order_amount: (parseFloat(form.min_delivery_order_amount) || 0).toFixed(2),
        allowed_pincodes: String(form.allowed_pincodes || '').trim(),
        store_latitude: form.store_latitude ? parseFloat(form.store_latitude).toFixed(6) : '17.385044',
        store_longitude: form.store_longitude ? parseFloat(form.store_longitude).toFixed(6) : '78.486671',
        delivery_radius_km: form.delivery_radius_km ? parseFloat(form.delivery_radius_km).toFixed(2) : '5.00',
        enforce_delivery_radius: Boolean(form.enforce_delivery_radius),
        popular_searches: String(form.popular_searches || '').trim(),
        show_popular_picks: Boolean(form.show_popular_picks),
        popular_picks_title: String(form.popular_picks_title || 'Popular picks').trim(),
        show_great_deals: Boolean(form.show_great_deals),
        great_deals_title: String(form.great_deals_title || 'Great Deals').trim(),
        show_new_arrivals: Boolean(form.show_new_arrivals),
        new_arrivals_title: String(form.new_arrivals_title || 'New Arrivals').trim(),
        brand_theme_preset: String(form.brand_theme_preset || 'vacation').trim(),
        palette_mode: parseInt(String(form.palette_mode || 5), 10) || 5,
        custom_primary_color: safePrimary,
        custom_secondary_color: safeSecondary,
        custom_accent_color: safeAccent,
        custom_canvas_color: safeCanvas,
        custom_text_color: safeText,
        apply_theme_to_owner_app: Boolean(form.apply_theme_to_owner_app),
      };

      if (signatureChanged && signatureUri) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          formData.append(k, String(v));
        });

        const rawFilename = signatureUri.split('/').pop() || 'signature.png';
        const match = /\.(\w+)$/.exec(rawFilename);
        const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/png';

        if (Platform.OS === 'web') {
          const res = await fetch(signatureUri);
          const blob = await res.blob();
          formData.append('invoice_signature', blob, rawFilename);
        } else {
          formData.append('invoice_signature', {
            uri: signatureUri,
            name: rawFilename,
            type: mimeType,
          } as any);
        }

        await api.patch('/store/settings/', formData);
        setSignatureChanged(false);
      } else {
        await api.patch('/store/settings/', payload);
      }

      (api as ApiInstance).clearCache();
      try {
        await refreshTheme?.(payload);
      } catch {}
      showAlert('Success', 'All store settings saved successfully!');
    } catch (e: any) {
      showAlert('Save Error', getErrorMessage(e, 'Failed to save store settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading store settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Store Settings"
        subtitle="Operations, delivery & email"
        rightAction={
          <View style={styles.headerActionsRow}>
            <TouchableOpacity
              style={[styles.actionPill, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={handleQuickDownloadBackup}
              disabled={downloadingBackup}
            >
              <Ionicons name="download-outline" size={15} color={colors.text} />
              <Text style={[styles.actionPillText, { color: colors.text }]}>
                {downloadingBackup ? '...' : 'Backup'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerSaveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSaveAll}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.headerSaveBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.maxContainer}>

          {/* Quick Link Banner to Advanced Settings */}
          <TouchableOpacity
            style={[
              styles.advancedShortcutBanner,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/more/advanced-settings' as any)}
          >
            <View style={styles.advancedShortcutLeft}>
              <View style={[styles.advancedIconBox, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                <Ionicons name="options-outline" size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.advancedShortcutTitle, { color: colors.text }]}>
                  Looking for UPI, Operating Hours, or Slots?
                </Text>
                <Text style={[styles.advancedShortcutSub, { color: colors.textMuted }]}>
                  Tap to configure Advanced Store Settings →
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Section 1: Store Profile & Status */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Store Identity & Operations</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Basic information, GPS coordinates and current active status
                </Text>
              </View>
            </View>

            <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Accepting Orders (Store Open)</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  {form.is_open ? 'Store is open and accepting new customer orders' : 'Store is paused / offline'}
                </Text>
              </View>
              <ModernSwitch
                value={Boolean(form.is_open)}
                onValueChange={(v) => updateField('is_open', v)}
              />
            </View>

            <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Auto-Accept Incoming Orders</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  {"Automatically move newly placed orders to 'ACCEPTED' status"}
                </Text>
              </View>
              <ModernSwitch
                value={Boolean(form.auto_accept_orders)}
                onValueChange={(v) => updateField('auto_accept_orders', v)}
              />
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>Store Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              value={String(form.store_name || '')}
              onChangeText={(v) => updateField('store_name', v)}
              placeholder="Narendra Kirana"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Store Address</Text>
            <TextInput
              style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              value={String(form.store_address || '')}
              onChangeText={(v) => updateField('store_address', v)}
              placeholder="Full physical store address"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Store Latitude</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(form.store_latitude || '')}
                  onChangeText={(v) => updateField('store_latitude', v)}
                  placeholder="17.385044"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Store Longitude</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(form.store_longitude || '')}
                  onChangeText={(v) => updateField('store_longitude', v)}
                  placeholder="78.486671"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          </View>

          {/* Section: Storefront Look & Theme */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: `${previewPrimary}25` }]}>
                <Ionicons name="color-palette" size={20} color={previewPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Store Look & Theme</Text>
                  <View style={[styles.activeModePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', borderColor: colors.border }]}>
                    <View style={[styles.activeModeDot, { backgroundColor: previewPrimary }]} />
                    <Text style={[styles.activeModePillText, { color: colors.text }]}>
                      {form.palette_mode || 5}-Color Mode
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Rebrand customer storefront and mobile apps with 1 tap
                </Text>
              </View>
            </View>

            {/* Realistic Interactive Smartphone Mockup */}
            <View style={styles.previewSectionWrapper}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>
                  Live Customer Storefront Preview
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: previewPrimary }}>
                  {isCustomPreset ? 'Custom Palette' : (activePreset?.name || 'Vacation Retro')}
                </Text>
              </View>

              {/* Mini Smartphone Frame */}
              <View style={[styles.mockupPhoneFrame, { backgroundColor: previewCanvas, borderColor: colors.border }]}>
                {/* Mockup Header */}
                <View style={[styles.mockupHeaderRow, { borderBottomColor: 'rgba(0,0,0,0.06)' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.mockupMiniIcon, { backgroundColor: previewPrimary }]}>
                      <Ionicons name="storefront" size={10} color="#ffffff" />
                    </View>
                    <Text style={[styles.mockupLogoText, { color: previewText }]}>
                      {form.store_name || 'Narendra'}{' '}
                      <Text style={{ color: previewPrimary, fontWeight: '900' }}>Store</Text>
                    </Text>
                  </View>
                  <View style={[styles.mockupCartBadge, { backgroundColor: previewPrimary }]}>
                    <Ionicons name="cart" size={11} color="#ffffff" />
                    <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: '900' }}>2</Text>
                  </View>
                </View>

                {/* Mockup Deals Banner */}
                <View style={[styles.mockupDealBanner, { backgroundColor: previewAccent }]}>
                  <Ionicons name="flash" size={11} color="#1c1917" />
                  <Text style={styles.mockupDealText}>
                    {Number(form.palette_mode || 5) === 2
                      ? '⚡ TODAY’S SPECIAL OFFERS & DEALS'
                      : '⚡ FRESH VEGETABLES & FRUITS • UP TO 25% OFF'}
                  </Text>
                </View>

                {/* Mockup Product Card Row */}
                <View style={[styles.mockupProductRow, { backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.08)' }]}>
                  <View style={styles.mockupProductThumb}>
                    <Text style={{ fontSize: 20 }}>🥭</Text>
                  </View>
                  <View style={{ flex: 1, paddingVertical: 1 }}>
                    <Text style={[styles.mockupProdName, { color: previewText }]} numberOfLines={1}>
                      Alphonso Mangoes (1 kg)
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[styles.mockupProdPrice, { color: previewText }]}>₹149</Text>
                      <Text style={styles.mockupProdMrp}>₹180</Text>
                    </View>
                    {Number(form.palette_mode || 5) >= 3 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 }}>
                        <Ionicons name="bicycle" size={10} color={previewSecondary} />
                        <Text style={[styles.mockupProdDelivery, { color: previewSecondary }]}>
                          10-Min Fast Delivery
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.mockupAddButton, { backgroundColor: previewPrimary }]}>
                    <Text style={styles.mockupAddButtonText}>+ ADD</Text>
                  </View>
                </View>

                {/* Active Palette Tokens Pill Row */}
                <View style={[styles.tokenStrip, { borderTopColor: 'rgba(0,0,0,0.06)' }]}>
                  <View style={styles.tokenPill}>
                    <View style={[styles.miniDot, { backgroundColor: previewPrimary }]} />
                    <Text style={styles.tokenLabel}>Primary</Text>
                  </View>
                  {Number(form.palette_mode || 5) >= 3 && (
                    <View style={styles.tokenPill}>
                      <View style={[styles.miniDot, { backgroundColor: previewSecondary }]} />
                      <Text style={styles.tokenLabel}>Delivery</Text>
                    </View>
                  )}
                  <View style={styles.tokenPill}>
                    <View style={[styles.miniDot, { backgroundColor: previewAccent }]} />
                    <Text style={styles.tokenLabel}>Offers</Text>
                  </View>
                  {Number(form.palette_mode || 5) >= 4 && (
                    <View style={styles.tokenPill}>
                      <View style={[styles.miniDot, { backgroundColor: previewCanvas }]} />
                      <Text style={styles.tokenLabel}>Canvas</Text>
                    </View>
                  )}
                  {Number(form.palette_mode || 5) >= 5 && (
                    <View style={styles.tokenPill}>
                      <View style={[styles.miniDot, { backgroundColor: previewText }]} />
                      <Text style={styles.tokenLabel}>Text</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Palette Complexity Mode Tabs */}
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 16, marginBottom: 8 }]}>
              1. Choose Palette Complexity Mode
            </Text>
            <View style={styles.paletteModeRow}>
              {[
                { mode: 2, label: '2 Colors', sub: 'Minimalist' },
                { mode: 3, label: '3 Colors', sub: 'Classic Trio' },
                { mode: 4, label: '4 Colors', sub: 'Rich Ambient' },
                { mode: 5, label: '5 Colors', sub: 'Full Theme' },
              ].map((item) => {
                const isActive = (form.palette_mode || 5) === item.mode;
                return (
                  <TouchableOpacity
                    key={item.mode}
                    activeOpacity={0.7}
                    onPress={() => updateField('palette_mode', item.mode)}
                    style={[
                      styles.paletteModeTab,
                      {
                        backgroundColor: isActive ? previewPrimary : colors.cardAlt,
                        borderColor: isActive ? previewPrimary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.paletteModeTabText,
                        { color: isActive ? '#ffffff' : colors.text, fontWeight: isActive ? '700' : '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.paletteModeTabSub,
                        { color: isActive ? 'rgba(255,255,255,0.85)' : colors.textMuted },
                      ]}
                    >
                      {item.sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Mode Description Banner */}
            <View style={[styles.modeInfoBanner, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Ionicons name="sparkles-outline" size={16} color={previewPrimary} />
              <Text style={[styles.modeInfoText, { color: colors.textMuted }]}>
                {Number(form.palette_mode ?? 5) === 2 && '2-Color Mode: Fast & minimalist. You set Primary Brand & Offers Accent; background and text are clean neutrals.'}
                {Number(form.palette_mode ?? 5) === 3 && '3-Color Mode: Standard e-commerce trio. Primary Brand, Delivery Fleet (Denim), and Offers & Deals Accent.'}
                {Number(form.palette_mode ?? 5) === 4 && '4-Color Mode: Rich ambient atmosphere. Primary Brand, Delivery, Offers, and custom Canvas Surface Tint.'}
                {Number(form.palette_mode ?? 5) === 5 && '5-Color Mode: Full Vacation Atmosphere Master. Total control over all 5 tokens including soft charcoal typography.'}
              </Text>
            </View>

            {/* 2. Presets List */}
            <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>
              2. Select Brand Theme Preset
            </Text>
            <View style={{ gap: 10 }}>
              {Object.values(THEME_PRESETS).map((p) => {
                const isSelected = (form.brand_theme_preset || 'vacation') === p.id;
                const currentMode = Number(form.palette_mode || 5);
                const swatches = currentMode === 2
                  ? [p.primary, p.accent]
                  : currentMode === 3
                  ? [p.primary, p.secondary, p.accent]
                  : currentMode === 4
                  ? [p.primary, p.secondary, p.accent, p.canvas || '#f7f5f0']
                  : [p.primary, p.secondary, p.accent, p.canvas || '#f7f5f0', p.text || '#323232'];

                return (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      updateField('brand_theme_preset', p.id);
                      updateField('custom_primary_color', p.primary);
                      updateField('custom_secondary_color', p.secondary);
                      updateField('custom_accent_color', p.accent);
                      updateField('custom_canvas_color', p.canvas || '#f7f5f0');
                      updateField('custom_text_color', p.text || '#323232');
                    }}
                    style={[
                      styles.themeCard,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: isSelected ? p.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.themeCardTitle, { color: colors.text }]}>{p.name}</Text>
                        {isSelected && (
                          <View style={[styles.selectedBadge, { backgroundColor: p.primary }]}>
                            <Text style={styles.selectedBadgeText}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.themeCardSub, { color: colors.textMuted }]}>{p.tagline}</Text>
                    </View>
                    <View style={styles.swatchRow}>
                      {swatches.map((c, idx) => (
                        <View key={idx} style={[styles.swatchDot, { backgroundColor: c }]} />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Color Option */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => updateField('brand_theme_preset', 'custom')}
              style={[
                styles.themeCard,
                {
                  marginTop: 10,
                  backgroundColor: colors.cardAlt,
                  borderColor: form.brand_theme_preset === 'custom' ? previewPrimary : colors.border,
                  borderWidth: form.brand_theme_preset === 'custom' ? 2 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.themeCardTitle, { color: colors.text }]}>🎨 Custom Palette</Text>
                  {form.brand_theme_preset === 'custom' && (
                    <View style={[styles.selectedBadge, { backgroundColor: previewPrimary }]}>
                      <Text style={styles.selectedBadgeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.themeCardSub, { color: colors.textMuted }]}>
                  Customize your own {form.palette_mode || 5}-color brand palette
                </Text>
              </View>
              <View style={styles.swatchRow}>
                {(Number(form.palette_mode || 5) === 2
                  ? [safePrimary, safeAccent]
                  : Number(form.palette_mode || 5) === 3
                  ? [safePrimary, safeSecondary, safeAccent]
                  : Number(form.palette_mode || 5) === 4
                  ? [safePrimary, safeSecondary, safeAccent, safeCanvas]
                  : [safePrimary, safeSecondary, safeAccent, safeCanvas, safeText]
                ).map((c, idx) => (
                  <View key={idx} style={[styles.swatchDot, { backgroundColor: c }]} />
                ))}
              </View>
            </TouchableOpacity>

            {/* Custom Color Form Fields (Adaptive to Palette Mode) with Quick-Pick Chips */}
            {form.brand_theme_preset === 'custom' && (
              <View style={{ marginTop: 14, gap: 10 }}>
                {/* 1. Primary Brand */}
                <View style={styles.customColorField}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>1. Primary Brand (Main CTA & Tabs)</Text>
                    <View style={[styles.swatchDot, { backgroundColor: safePrimary }]} />
                  </View>
                  <View style={styles.quickPickRow}>
                    {CURATED_PALETTES.primary.map((hex) => (
                      <TouchableOpacity
                        key={hex}
                        onPress={() => updateField('custom_primary_color', hex)}
                        style={[styles.quickPickDot, { backgroundColor: hex, borderColor: safePrimary.toLowerCase() === hex.toLowerCase() ? colors.text : 'transparent' }]}
                      />
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginTop: 6 }]}
                    value={String(form.custom_primary_color || '#5ba8a6')}
                    onChangeText={(v) => updateField('custom_primary_color', v)}
                    placeholder="#5ba8a6"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                {/* 2. Secondary Color (Shown in 3, 4, 5-Color Modes) */}
                {(form.palette_mode || 5) >= 3 && (
                  <View style={styles.customColorField}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>2. Secondary (Delivery & Fleet)</Text>
                      <View style={[styles.swatchDot, { backgroundColor: safeSecondary }]} />
                    </View>
                    <View style={styles.quickPickRow}>
                      {CURATED_PALETTES.secondary.map((hex) => (
                        <TouchableOpacity
                          key={hex}
                          onPress={() => updateField('custom_secondary_color', hex)}
                          style={[styles.quickPickDot, { backgroundColor: hex, borderColor: safeSecondary.toLowerCase() === hex.toLowerCase() ? colors.text : 'transparent' }]}
                        />
                      ))}
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginTop: 6 }]}
                      value={String(form.custom_secondary_color || '#4d69a5')}
                      onChangeText={(v) => updateField('custom_secondary_color', v)}
                      placeholder="#4d69a5"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* 3. Offers & Deals Accent */}
                <View style={styles.customColorField}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>
                      {(form.palette_mode || 5) === 2 ? '2. Offers & Deals Accent' : '3. Offers & Deals Accent'}
                    </Text>
                    <View style={[styles.swatchDot, { backgroundColor: safeAccent }]} />
                  </View>
                  <View style={styles.quickPickRow}>
                    {CURATED_PALETTES.accent.map((hex) => (
                      <TouchableOpacity
                        key={hex}
                        onPress={() => updateField('custom_accent_color', hex)}
                        style={[styles.quickPickDot, { backgroundColor: hex, borderColor: safeAccent.toLowerCase() === hex.toLowerCase() ? colors.text : 'transparent' }]}
                      />
                    ))}
                  </View>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginTop: 6 }]}
                    value={String(form.custom_accent_color || '#ecd386')}
                    onChangeText={(v) => updateField('custom_accent_color', v)}
                    placeholder="#ecd386"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>

                {/* 4. Canvas Surface Tint (Shown in 4 and 5-Color Modes) */}
                {(form.palette_mode || 5) >= 4 && (
                  <View style={styles.customColorField}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>4. Canvas Surface Tint (Background)</Text>
                      <View style={[styles.swatchDot, { backgroundColor: safeCanvas }]} />
                    </View>
                    <View style={styles.quickPickRow}>
                      {CURATED_PALETTES.canvas.map((hex) => (
                        <TouchableOpacity
                          key={hex}
                          onPress={() => updateField('custom_canvas_color', hex)}
                          style={[styles.quickPickDot, { backgroundColor: hex, borderColor: safeCanvas.toLowerCase() === hex.toLowerCase() ? colors.text : 'transparent' }]}
                        />
                      ))}
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginTop: 6 }]}
                      value={String(form.custom_canvas_color || '#eae6dd')}
                      onChangeText={(v) => updateField('custom_canvas_color', v)}
                      placeholder="#eae6dd"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* 5. Typography & Text Color (Shown in 5-Color Mode) */}
                {(form.palette_mode || 5) >= 5 && (
                  <View style={styles.customColorField}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={[styles.label, { color: colors.textMuted, marginBottom: 0 }]}>5. Typography & Text Color</Text>
                      <View style={[styles.swatchDot, { backgroundColor: safeText }]} />
                    </View>
                    <View style={styles.quickPickRow}>
                      {CURATED_PALETTES.text.map((hex) => (
                        <TouchableOpacity
                          key={hex}
                          onPress={() => updateField('custom_text_color', hex)}
                          style={[styles.quickPickDot, { backgroundColor: hex, borderColor: safeText.toLowerCase() === hex.toLowerCase() ? colors.text : 'transparent' }]}
                        />
                      ))}
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, marginTop: 6 }]}
                      value={String(form.custom_text_color || '#323232')}
                      onChangeText={(v) => updateField('custom_text_color', v)}
                      placeholder="#323232"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </View>
            )}

            {/* Apply to Owner App Dashboard Switch */}
            <View style={[styles.switchCard, { marginTop: 14, backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Apply to Owner App Dashboard</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Also style this owner operations app in the chosen theme
                </Text>
              </View>
              <ModernSwitch
                value={Boolean(form.apply_theme_to_owner_app)}
                onValueChange={(v) => updateField('apply_theme_to_owner_app', v)}
              />
            </View>

            {/* Instant Publish Theme Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleApplyThemeOnly}
              disabled={applyingTheme}
              style={[
                styles.publishThemeBtn,
                { backgroundColor: previewPrimary },
                applyingTheme && { opacity: 0.7 },
              ]}
            >
              {applyingTheme ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="sparkles" size={16} color="#ffffff" />
              )}
              <Text style={styles.publishThemeBtnText}>
                {applyingTheme ? 'Publishing Theme...' : 'Publish Theme to Storefront'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Section 2: App Search Ticker (Popular Searches) */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="search-outline" size={20} color="#6366f1" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>App Search Ticker</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Animated search placeholders
                </Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>
              Popular Searches (One search term per line)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { minHeight: 95, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              multiline
              numberOfLines={5}
              value={String(form.popular_searches || '')}
              onChangeText={(v) => updateField('popular_searches', v)}
              placeholder={'Aashirvaad Shudh Chakki Atta\nFresh Paneer & Milk\nFortune Sunflower Oil\nBasmati Rice & Dals\nTata Salt & Spices'}
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              💡 These keywords animate automatically inside the top search bar placeholder in both customer mobile and web apps.
            </Text>
          </View>

          {/* Section 3: Order Constraints & Fees */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Ionicons name="receipt-outline" size={20} color="#3b82f6" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Order Rules & Inventory</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Minimum cart totals, packaging fees, and stock warnings
                </Text>
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Min Order Amount (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(form.min_order_amount ?? '0.00')}
                  onChangeText={(v) => updateField('min_order_amount', v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Packaging Fee (₹)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(form.packaging_fee ?? '0.00')}
                  onChangeText={(v) => updateField('packaging_fee', v)}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>Low Stock Alert Threshold (Units)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              keyboardType="numeric"
              value={String(form.low_stock_threshold ?? '5')}
              onChangeText={(v) => updateField('low_stock_threshold', v)}
              placeholder="5"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Section 4: Delivery Rules & Geofence */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(234, 88, 12, 0.15)' }]}>
                <Ionicons name="bicycle-outline" size={20} color="#ea580c" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Delivery Rules & Geofencing</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Home delivery pricing, radius limits, and postal zones
                </Text>
              </View>
            </View>

            {/* Delivery Mode Selector */}
            <Text style={[styles.label, { color: colors.textMuted }]}>Store Order Fulfillment Mode</Text>
            <View style={styles.providerRow}>
              {[
                { key: 'PICKUP', label: 'Store Pickup Only' },
                { key: 'DELIVERY', label: 'Delivery Only' },
                { key: 'BOTH', label: 'Pickup & Delivery' },
              ].map((mode) => {
                const isSelected = form.delivery_mode === mode.key;
                return (
                  <TouchableOpacity
                    key={mode.key}
                    style={[
                      styles.providerPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.cardAlt,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      updateField('delivery_mode', mode.key);
                      if (mode.key === 'PICKUP') {
                        updateField('is_home_delivery_active', false);
                      } else {
                        updateField('is_home_delivery_active', true);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.providerPillText,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Home Delivery</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Allow customers to choose door delivery at checkout
                </Text>
              </View>
              <ModernSwitch
                value={Boolean(form.is_home_delivery_active)}
                onValueChange={(v) => {
                  updateField('is_home_delivery_active', v);
                  updateField('delivery_mode', v ? 'BOTH' : 'PICKUP');
                }}
              />
            </View>

            {Boolean(form.is_home_delivery_active) && (
              <>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Delivery Fee (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                      keyboardType="numeric"
                      value={String(form.delivery_fee ?? '0.00')}
                      onChangeText={(v) => updateField('delivery_fee', v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Free Delivery Above (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                      keyboardType="numeric"
                      value={String(form.free_delivery_threshold ?? '0.00')}
                      onChangeText={(v) => updateField('free_delivery_threshold', v)}
                    />
                  </View>
                </View>

                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Min Delivery Order (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                      keyboardType="numeric"
                      value={String(form.min_delivery_order_amount ?? '150.00')}
                      onChangeText={(v) => updateField('min_delivery_order_amount', v)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Delivery Radius (km)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                      keyboardType="numeric"
                      value={String(form.delivery_radius_km ?? '5.00')}
                      onChangeText={(v) => updateField('delivery_radius_km', v)}
                    />
                  </View>
                </View>

                {/* Map Navigation Link */}
                <TouchableOpacity
                  style={[styles.mapShortcutBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={() => router.push('/(tabs)/more/map' as any)}
                >
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mapShortcutTitle, { color: colors.text }]}>
                      Open Live GPS Radar & Geofence Map
                    </Text>
                    <Text style={[styles.mapShortcutSub, { color: colors.textMuted }]}>
                      View live visual circle boundary centered on store coordinates
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Allowed Pincodes (Comma-separated, leave blank for all)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  placeholder="500001, 500002, 500003"
                  placeholderTextColor={colors.textMuted}
                  value={String(form.allowed_pincodes || '')}
                  onChangeText={(v) => updateField('allowed_pincodes', v)}
                />
              </>
            )}
          </View>

          {/* Section 5: Store Email & SMTP Configuration */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="mail-outline" size={20} color="#6366f1" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Email & SMTP Credentials</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Automated order confirmations & owner email notices
                </Text>
              </View>
            </View>

            <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Custom SMTP Sending</Text>
                <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                  Send order receipts directly from your own Gmail or store domain
                </Text>
              </View>
              <ModernSwitch
                value={Boolean(emailSettings.is_active)}
                onValueChange={(v) => updateEmailField('is_active', v)}
              />
            </View>

            <Text style={[styles.label, { color: colors.textMuted, marginTop: 4 }]}>Provider Preset</Text>
            <View style={styles.providerRow}>
              {(['gmail', 'outlook', 'custom'] as const).map((prov) => {
                const isSelected = emailSettings.provider === prov;
                return (
                  <TouchableOpacity
                    key={prov}
                    style={[
                      styles.providerPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.cardAlt,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectEmailProvider(prov)}
                  >
                    <Text
                      style={[
                        styles.providerPillText,
                        { color: isSelected ? '#fff' : colors.text },
                      ]}
                    >
                      {prov === 'gmail' ? 'Gmail / Workspace' : prov === 'outlook' ? 'Outlook 365' : 'Custom SMTP'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>Sender Display Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              value={String(emailSettings.sender_name || '')}
              onChangeText={(v) => updateEmailField('sender_name', v)}
              placeholder="Narendra Kirana"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.label, { color: colors.textMuted }]}>Sender Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
              value={String(emailSettings.sender_email || '')}
              onChangeText={(v) => updateEmailField('sender_email', v)}
              placeholder="owner@example.com"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>SMTP Host</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  autoCapitalize="none"
                  value={String(emailSettings.smtp_host || '')}
                  onChangeText={(v) => updateEmailField('smtp_host', v)}
                  placeholder="smtp.gmail.com"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>SMTP Port</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="numeric"
                  value={String(emailSettings.smtp_port || '587')}
                  onChangeText={(v) => updateEmailField('smtp_port', v)}
                  placeholder="587"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={[styles.switchCard, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.text, fontSize: 13 }]}>Use TLS</Text>
                <ModernSwitch
                  value={Boolean(emailSettings.use_tls)}
                  onValueChange={(v) => updateEmailField('use_tls', v)}
                />
              </View>
              <View style={[styles.switchCard, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.text, fontSize: 13 }]}>Use SSL</Text>
                <ModernSwitch
                  value={Boolean(emailSettings.use_ssl)}
                  onValueChange={(v) => updateEmailField('use_ssl', v)}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>
              App Password / Secret
            </Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text, flex: 1, marginBottom: 0 },
                ]}
                secureTextEntry={!showAppPassword}
                value={String(emailSettings.app_password || '')}
                onChangeText={(v) => updateEmailField('app_password', v)}
                placeholder="16-character Google App Password"
                placeholderTextColor={colors.textMuted}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowAppPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showAppPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Google Guide Toggle */}
            <TouchableOpacity
              style={styles.guideToggleBtn}
              onPress={() => setShowGoogleGuide(!showGoogleGuide)}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
              <Text style={[styles.guideToggleText, { color: colors.primary }]}>
                {showGoogleGuide ? 'Hide Google App Password setup guide' : 'How to generate a Google App Password?'}
              </Text>
            </TouchableOpacity>

            {showGoogleGuide && (
              <View style={[styles.guideBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.guideStep, { color: colors.text }]}>1. Go to Google Account Security</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>2. Ensure 2-Step Verification is turned ON</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>{'3. Search for "App Passwords" in Google Security'}</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>{'4. Create a new password named "Narendra Kirana Store"'}</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>5. Copy the 16-character code into the field above</Text>
              </View>
            )}

            <View style={styles.emailActionsRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}
                onPress={() => setTestModalOpen(true)}
              >
                <Ionicons name="paper-plane-outline" size={16} color={colors.text} />
                <Text style={[styles.outlineBtnText, { color: colors.text }]}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                onPress={handleSaveEmailSettings}
                disabled={savingEmail}
              >
                {savingEmail ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={styles.primaryBtnSmallText}>Save Email Config</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 6: Invoicing & Digital Signature */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                <Ionicons name="document-text-outline" size={20} color="#ec4899" />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Invoicing & Digital Signature</Text>
                <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                  Customer receipt contact details and official stamp/signature
                </Text>
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Contact Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="phone-pad"
                  value={String(form.store_phone || '')}
                  onChangeText={(v) => updateField('store_phone', v)}
                  placeholder="+91 9876543210"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors.textMuted }]}>Support Email</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                  keyboardType="email-address"
                  value={String(form.store_email || '')}
                  onChangeText={(v) => updateField('store_email', v)}
                  placeholder="support@narendrakirana.in"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>Store Digital Signature / Stamp</Text>
            {signatureUri ? (
              <View style={[styles.signatureBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Image
                  source={{ uri: signatureUri }}
                  style={styles.signatureImage}
                  contentFit="contain"
                />
                <View style={styles.signatureBtnRow}>
                  <TouchableOpacity
                    style={[styles.smallPickBtn, { backgroundColor: colors.primary }]}
                    onPress={handlePickSignature}
                  >
                    <Ionicons name="image-outline" size={14} color="#fff" />
                    <Text style={styles.smallPickBtnText}>Replace Signature</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallPickBtn, { backgroundColor: '#ef4444' }]}
                    onPress={handleRemoveSignature}
                  >
                    <Ionicons name="trash-outline" size={14} color="#fff" />
                    <Text style={styles.smallPickBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.signaturePlaceholder, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                onPress={handlePickSignature}
              >
                <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                <Text style={[styles.signaturePlaceholderText, { color: colors.text }]}>
                  Upload Store Signature
                </Text>
                <Text style={[styles.signaturePlaceholderSub, { color: colors.textMuted }]}>
                  Select transparent PNG or clear signature image from device
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveAllBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveAll}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveAllBtnText}>Save All Store Settings</Text>
              </>
            )}
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Test Email Modal */}
      <Modal visible={testModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Send Test Email</Text>
              <TouchableOpacity onPress={() => setTestModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textMuted }]}>Recipient Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
              keyboardType="email-address"
              autoCapitalize="none"
              value={testRecipient}
              onChangeText={setTestRecipient}
              placeholder="recipient@example.com"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}
                onPress={() => setTestModalOpen(false)}
              >
                <Text style={[styles.outlineBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtnSmall, { backgroundColor: colors.primary }]}
                onPress={handleSendTestEmail}
                disabled={testingEmail}
              >
                {testingEmail ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#fff" />
                    <Text style={styles.primaryBtnSmallText}>Send Test</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 200,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  screenSub: {
    fontSize: 12,
    marginTop: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionPillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionPillPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  maxContainer: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    gap: 16,
  },
  card: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: 12,
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  multilineInput: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  providerPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerPillText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  mapShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  mapShortcutTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapShortcutSub: {
    fontSize: 12,
    marginTop: 2,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  eyeBtn: {
    padding: 10,
  },
  guideToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  guideToggleText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  guideBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    marginBottom: 12,
  },
  guideStep: {
    fontSize: 12,
    lineHeight: 18,
  },
  emailActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  primaryBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryBtnSmallText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  signatureBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  signatureImage: {
    width: '100%',
    height: 100,
    borderRadius: 6,
  },
  signatureBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallPickBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  signaturePlaceholder: {
    padding: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  signaturePlaceholderText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  signaturePlaceholderSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  saveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveAllBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  advancedShortcutBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  advancedShortcutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  advancedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedShortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  advancedShortcutSub: {
    fontSize: 11,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  themeCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  themeCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  swatchDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  selectedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  selectedBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  paletteModeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  paletteModeTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteModeTabText: {
    fontSize: 12,
    textAlign: 'center',
  },
  paletteModeTabSub: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  modeInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  modeInfoText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  customColorField: {
    marginBottom: 10,
  },
  activeModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeModeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeModePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  previewSectionWrapper: {
    marginTop: 12,
  },
  mockupPhoneFrame: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  mockupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  mockupMiniIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupLogoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mockupCartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mockupDealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  mockupDealText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1c1917',
    letterSpacing: 0.3,
  },
  mockupProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  mockupProductThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupProdName: {
    fontSize: 11,
    fontWeight: '700',
  },
  mockupProdPrice: {
    fontSize: 11,
    fontWeight: '800',
  },
  mockupProdMrp: {
    fontSize: 9,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  mockupProdDelivery: {
    fontSize: 9,
    fontWeight: '600',
  },
  mockupAddButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockupAddButtonText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  tokenStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 6,
    borderTopWidth: 1,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  tokenLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
  },
  quickPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
    flexWrap: 'wrap',
  },
  quickPickDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  publishThemeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  publishThemeBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
