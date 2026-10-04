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
import { showAlert } from '../../../utils/alerts';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  });

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
            app_password: em.app_password || '',
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
        await Linking.openURL(exportUrl);
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
        app_password: res.data?.app_password ?? payload.app_password ?? prev.app_password,
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
        <ActivityIndicator size="large" color="#10b981" />
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
              style={[styles.headerSaveBtn, { backgroundColor: '#10b981', opacity: saving ? 0.7 : 1 }]}
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
                <Ionicons name="storefront-outline" size={20} color="#10b981" />
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
                  Automatically move newly placed orders to 'ACCEPTED' status
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
                        backgroundColor: isSelected ? '#10b981' : colors.cardAlt,
                        borderColor: isSelected ? '#10b981' : colors.border,
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
                  <Ionicons name="map-outline" size={18} color="#10b981" />
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
                        backgroundColor: isSelected ? '#10b981' : colors.cardAlt,
                        borderColor: isSelected ? '#10b981' : colors.border,
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
              <Ionicons name="help-circle-outline" size={16} color="#10b981" />
              <Text style={styles.guideToggleText}>
                {showGoogleGuide ? 'Hide Google App Password setup guide' : 'How to generate a Google App Password?'}
              </Text>
            </TouchableOpacity>

            {showGoogleGuide && (
              <View style={[styles.guideBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.guideStep, { color: colors.text }]}>1. Go to Google Account Security</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>2. Ensure 2-Step Verification is turned ON</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>3. Search for "App Passwords" in Google Security</Text>
                <Text style={[styles.guideStep, { color: colors.text }]}>4. Create a new password named "Narendra Kirana Store"</Text>
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
                style={[styles.primaryBtnSmall, { backgroundColor: '#10b981' }]}
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
                    style={[styles.smallPickBtn, { backgroundColor: '#10b981' }]}
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
                <Ionicons name="cloud-upload-outline" size={28} color="#10b981" />
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
            style={[styles.saveAllBtn, { backgroundColor: '#10b981' }]}
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
                style={[styles.primaryBtnSmall, { backgroundColor: '#10b981' }]}
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
    color: '#10b981',
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
    shadowColor: '#10b981',
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
});
