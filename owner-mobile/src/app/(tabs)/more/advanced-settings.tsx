import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

type SectionTab =
  | 'payments'
  | 'legal'
  | 'timings'
  | 'slots'
  | 'whatsapp'
  | 'loyalty'
  | 'announcements'
  | 'mobile'
  | 'backup';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export default function AdvancedSettingsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<SectionTab>('payments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [settings, setSettings] = useState<any>({
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
    preparation_buffer_minutes: '30',
    max_orders_per_slot: '15',
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
    max_wallet_usage_percentage: '50',
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
    app_name: 'Narendra Kirana',
    app_icon: null,
    app_download_btn_text: 'Download APK',
    min_mobile_version: '1.0.0',
    latest_mobile_version: '1.0.0',
    force_app_update: false,
    app_update_url: '',
    app_update_message: '',
    is_maintenance_mode: false,
    maintenance_message: '',
    maintenance_estimated_end: '',
  });

  // Image upload states
  const [upiQrUri, setUpiQrUri] = useState<string | null>(null);
  const [upiQrChanged, setUpiQrChanged] = useState(false);

  const [festiveImageUri, setFestiveImageUri] = useState<string | null>(null);
  const [festiveImageChanged, setFestiveImageChanged] = useState(false);

  const [appIconUri, setAppIconUri] = useState<string | null>(null);
  const [appIconChanged, setAppIconChanged] = useState(false);

  // New slot form state
  const [newSlotStart, setNewSlotStart] = useState('09:00');
  const [newSlotEnd, setNewSlotEnd] = useState('12:00');
  const [newSlotLabel, setNewSlotLabel] = useState('');

  // Backup tab states
  const [backupStats, setBackupStats] = useState<any>(null);
  const [loadingBackupStats, setLoadingBackupStats] = useState(false);
  const [downloadingBackup, setDownloadingBackup] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .get('/store/settings/', { params: { t: Date.now() } })
      .then((res) => {
        if (!isMounted || !res?.data) return;
        const d = res.data;

        let parsedTimings = d.store_timings_json;
        if (typeof parsedTimings === 'string') {
          try {
            parsedTimings = JSON.parse(parsedTimings);
          } catch {
            parsedTimings = {};
          }
        }

        let parsedSlots = d.time_slots_json;
        if (typeof parsedSlots === 'string') {
          try {
            parsedSlots = JSON.parse(parsedSlots);
          } catch {
            parsedSlots = [];
          }
        }

        setSettings((prev: any) => ({
          ...prev,
          ...d,
          preparation_buffer_minutes: String(d.preparation_buffer_minutes ?? '30'),
          max_orders_per_slot: String(d.max_orders_per_slot ?? '15'),
          max_wallet_usage_percentage: String(d.max_wallet_usage_percentage ?? '50'),
          referral_bonus_referrer: String(d.referral_bonus_referrer ?? '50.00'),
          referral_bonus_referee: String(d.referral_bonus_referee ?? '50.00'),
          referral_min_order_amount: String(d.referral_min_order_amount ?? '200.00'),
          order_cashback_percentage: String(d.order_cashback_percentage ?? '2.00'),
          store_timings_json: parsedTimings || {},
          time_slots_json: Array.isArray(parsedSlots) ? parsedSlots : [],
          announcement_start_date: d.announcement_start_date ? d.announcement_start_date.slice(0, 16) : '',
          announcement_end_date: d.announcement_end_date ? d.announcement_end_date.slice(0, 16) : '',
          maintenance_estimated_end: d.maintenance_estimated_end ? d.maintenance_estimated_end.slice(0, 16) : '',
        }));

        if (d.upi_qr_image) setUpiQrUri(d.upi_qr_image);
        if (d.festive_popup_image) setFestiveImageUri(d.festive_popup_image);
        if (d.app_icon) setAppIconUri(d.app_icon);
      })
      .catch((err) => {
        console.error('Failed to load advanced settings:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchBackupStats = async () => {
    setLoadingBackupStats(true);
    try {
      const res = await api.get('/store/backup/stats/');
      setBackupStats(res.data);
    } catch (err) {
      console.error('Failed to load backup stats:', err);
    } finally {
      setLoadingBackupStats(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackupStats();
    }
  }, [activeTab]);

  const updateField = (key: string, val: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleTimingChange = (day: string, field: 'open' | 'close' | 'is_closed', val: any) => {
    setSettings((prev: any) => {
      const currentTimings = prev.store_timings_json || {};
      const dayData = currentTimings[day] || { open: '08:00', close: '21:00', is_closed: false };
      return {
        ...prev,
        store_timings_json: {
          ...currentTimings,
          [day]: {
            ...dayData,
            [field]: val,
          },
        },
      };
    });
  };

  const handleAddSlot = () => {
    const label = newSlotLabel.trim() || `${newSlotStart} - ${newSlotEnd}`;
    const newSlot = {
      id: Date.now().toString(),
      start_time: newSlotStart.trim(),
      end_time: newSlotEnd.trim(),
      label,
    };
    setSettings((prev: any) => ({
      ...prev,
      time_slots_json: [...(prev.time_slots_json || []), newSlot],
    }));
    setNewSlotLabel('');
  };

  const handleRemoveSlot = (index: number) => {
    setSettings((prev: any) => ({
      ...prev,
      time_slots_json: (prev.time_slots_json || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const pickImageFile = async (
    onPicked: (uri: string) => void,
    aspect: [number, number] = [1, 1]
  ) => {
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
        aspect,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onPicked(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handleDownloadBackup = async () => {
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
        showAlert('Backup Ready', 'Complete store database backup exported successfully!');
      } else {
        const baseUrl = api.defaults.baseURL || 'https://narendra-kirana.onrender.com/api/v1';
        const exportUrl = `${baseUrl.replace(/\/+$/, '')}/store/backup/export/`;
        await Linking.openURL(exportUrl);
        showAlert('Export Initiated', 'Backup file download initiated in your browser.');
      }
    } catch (err) {
      showAlert('Backup Error', getErrorMessage(err, 'Failed to export store backup.'));
    } finally {
      setDownloadingBackup(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        // 1. UPI
        upi_id: String(settings.upi_id || '').trim(),
        upi_payee_name: String(settings.upi_payee_name || '').trim() || 'Narendra Kirana',
        enable_dynamic_upi_qr: Boolean(settings.enable_dynamic_upi_qr),
        // 2. Legal
        fssai_license_number: String(settings.fssai_license_number || '').trim().slice(0, 14),
        gstin: String(settings.gstin || '').trim().toUpperCase().slice(0, 15),
        enable_itemized_tax_invoice: Boolean(settings.enable_itemized_tax_invoice),
        invoice_terms_and_conditions: String(settings.invoice_terms_and_conditions || '').trim(),
        // 3. Timings
        is_emergency_paused: Boolean(settings.is_emergency_paused),
        emergency_pause_message: String(settings.emergency_pause_message || '').trim(),
        auto_cutoff_orders: Boolean(settings.auto_cutoff_orders),
        store_timings_json: settings.store_timings_json || {},
        // 4. Slots
        enable_time_slots: Boolean(settings.enable_time_slots),
        preparation_buffer_minutes: parseInt(settings.preparation_buffer_minutes, 10) || 30,
        max_orders_per_slot: parseInt(settings.max_orders_per_slot, 10) || 15,
        time_slots_json: settings.time_slots_json || [],
        // 5. WhatsApp
        enable_whatsapp_support: Boolean(settings.enable_whatsapp_support),
        whatsapp_number: String(settings.whatsapp_number || '').trim(),
        whatsapp_default_message: String(settings.whatsapp_default_message || '').trim(),
        whatsapp_order_help_template: String(settings.whatsapp_order_help_template || '').trim(),
        // 6. Loyalty
        referral_bonus_referrer: (parseFloat(settings.referral_bonus_referrer) || 0).toFixed(2),
        referral_bonus_referee: (parseFloat(settings.referral_bonus_referee) || 0).toFixed(2),
        referral_min_order_amount: (parseFloat(settings.referral_min_order_amount) || 0).toFixed(2),
        max_wallet_usage_percentage: Math.min(100, Math.max(0, parseInt(settings.max_wallet_usage_percentage, 10) || 50)),
        order_cashback_percentage: (parseFloat(settings.order_cashback_percentage) || 0).toFixed(2),
        // 7. Announcements
        enable_announcement_bar: Boolean(settings.enable_announcement_bar),
        announcement_text: String(settings.announcement_text || '').trim(),
        announcement_bg_color: settings.announcement_bg_color || '#16a34a',
        announcement_text_color: settings.announcement_text_color || '#ffffff',
        announcement_start_date: settings.announcement_start_date ? new Date(settings.announcement_start_date).toISOString() : null,
        announcement_end_date: settings.announcement_end_date ? new Date(settings.announcement_end_date).toISOString() : null,
        enable_festive_popup: Boolean(settings.enable_festive_popup),
        festive_popup_title: String(settings.festive_popup_title || '').trim(),
        festive_popup_content: String(settings.festive_popup_content || '').trim(),
        // 8. Mobile & Maintenance
        app_name: String(settings.app_name || '').trim(),
        app_download_btn_text: String(settings.app_download_btn_text || 'Download APK').trim(),
        min_mobile_version: String(settings.min_mobile_version || '1.0.0').trim(),
        latest_mobile_version: String(settings.latest_mobile_version || '1.0.0').trim(),
        force_app_update: Boolean(settings.force_app_update),
        app_update_url: String(settings.app_update_url || '').trim(),
        app_update_message: String(settings.app_update_message || '').trim(),
        is_maintenance_mode: Boolean(settings.is_maintenance_mode),
        maintenance_message: String(settings.maintenance_message || '').trim(),
        maintenance_estimated_end: settings.maintenance_estimated_end ? new Date(settings.maintenance_estimated_end).toISOString() : null,
      };

      const hasImageChanged = upiQrChanged || festiveImageChanged || appIconChanged;

      if (hasImageChanged) {
        const formData = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (typeof v === 'object' && v !== null) {
            formData.append(k, JSON.stringify(v));
          } else if (v !== null && v !== undefined) {
            formData.append(k, String(v));
          }
        });

        const appendFile = async (fieldName: string, uri: string) => {
          const rawFilename = uri.split('/').pop() || `${fieldName}.png`;
          const match = /\.(\w+)$/.exec(rawFilename);
          const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image/png';

          if (Platform.OS === 'web') {
            const res = await fetch(uri);
            const blob = await res.blob();
            formData.append(fieldName, blob, rawFilename);
          } else {
            formData.append(fieldName, {
              uri,
              name: rawFilename,
              type: mimeType,
            } as any);
          }
        };

        if (upiQrChanged && upiQrUri) await appendFile('upi_qr_image', upiQrUri);
        if (festiveImageChanged && festiveImageUri) await appendFile('festive_popup_image', festiveImageUri);
        if (appIconChanged && appIconUri) await appendFile('app_icon', appIconUri);

        await api.patch('/store/settings/', formData);
        setUpiQrChanged(false);
        setFestiveImageChanged(false);
        setAppIconChanged(false);
      } else {
        await api.patch('/store/settings/', payload);
      }

      (api as ApiInstance).clearCache();
      showAlert('Success', 'Advanced store settings saved successfully!');
    } catch (e: any) {
      showAlert('Save Error', getErrorMessage(e, 'Failed to save advanced settings.'));
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: SectionTab; label: string; icon: any }[] = [
    { key: 'payments', label: 'UPI & Payments', icon: 'qr-code-outline' },
    { key: 'legal', label: 'Legal & FSSAI', icon: 'shield-checkmark-outline' },
    { key: 'timings', label: 'Timings & Pause', icon: 'time-outline' },
    { key: 'slots', label: 'Delivery Slots', icon: 'calendar-outline' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
    { key: 'loyalty', label: 'Wallet & Cashback', icon: 'gift-outline' },
    { key: 'announcements', label: 'Marquee & Popup', icon: 'megaphone-outline' },
    { key: 'mobile', label: 'App & Maintenance', icon: 'phone-portrait-outline' },
    { key: 'backup', label: 'Data & Backup', icon: 'server-outline' },
  ];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading advanced settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.cardAlt }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: colors.text }]}>Advanced Settings</Text>
            <Text style={[styles.screenSub, { color: colors.textMuted }]}>
              Payments, schedules, delivery slots, loyalty & data
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderBtn, { backgroundColor: '#10b981' }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="#fff" />
              <Text style={styles.saveHeaderBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs Horizontal Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: isActive ? '#10b981' : colors.cardAlt,
                    borderColor: isActive ? '#10b981' : colors.border,
                  },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isActive ? '#fff' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isActive ? '#fff' : colors.text },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content Container */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.maxContainer}>

          {/* TAB 1: UPI & PAYMENTS */}
          {activeTab === 'payments' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="qr-code-outline" size={20} color="#10b981" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>UPI & Payment Gateway</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Accept instant UPI payments with dynamic QR codes
                  </Text>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>Store UPI ID (VPA)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.upi_id || '')}
                onChangeText={(v) => updateField('upi_id', v)}
                placeholder="merchant@upi or phone@paytm"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>UPI Payee Business Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.upi_payee_name || '')}
                onChangeText={(v) => updateField('upi_payee_name', v)}
                placeholder="Narendra Kirana Store"
                placeholderTextColor={colors.textMuted}
              />

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Dynamic UPI QR on Checkout</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Generates exact amount QR code on checkout screen
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.enable_dynamic_upi_qr)}
                  onValueChange={(v) => updateField('enable_dynamic_upi_qr', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>Static Store UPI QR Code Image</Text>
              {upiQrUri ? (
                <View style={[styles.imagePreviewBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Image source={{ uri: upiQrUri }} style={styles.squareImage} contentFit="contain" />
                  <View style={styles.imageActionRow}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: '#10b981' }]}
                      onPress={() =>
                        pickImageFile((uri) => {
                          setUpiQrUri(uri);
                          setUpiQrChanged(true);
                        })
                      }
                    >
                      <Ionicons name="image-outline" size={14} color="#fff" />
                      <Text style={styles.smallBtnText}>Replace QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: '#ef4444' }]}
                      onPress={() => {
                        setUpiQrUri(null);
                        setUpiQrChanged(true);
                      }}
                    >
                      <Ionicons name="trash-outline" size={14} color="#fff" />
                      <Text style={styles.smallBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePlaceholder, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  onPress={() =>
                    pickImageFile((uri) => {
                      setUpiQrUri(uri);
                      setUpiQrChanged(true);
                    })
                  }
                >
                  <Ionicons name="qr-code-outline" size={28} color="#10b981" />
                  <Text style={[styles.imagePlaceholderTitle, { color: colors.text }]}>Upload Store UPI QR Code</Text>
                  <Text style={[styles.imagePlaceholderSub, { color: colors.textMuted }]}>
                    Tap to select QR image from gallery
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* TAB 2: LEGAL & COMPLIANCE */}
          {activeTab === 'legal' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#3b82f6" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Legal, FSSAI & GST Compliance</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Regulatory identifiers and customer invoice terms
                  </Text>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>FSSAI License Number (14 digits)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                maxLength={14}
                value={String(settings.fssai_license_number || '')}
                onChangeText={(v) => updateField('fssai_license_number', v)}
                placeholder="14-digit FSSAI number"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>GSTIN (Goods and Services Tax ID)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                autoCapitalize="characters"
                maxLength={15}
                value={String(settings.gstin || '')}
                onChangeText={(v) => updateField('gstin', v)}
                placeholder="15-character GSTIN"
                placeholderTextColor={colors.textMuted}
              />

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Itemized Tax Invoice</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Break down CGST, SGST & item-level tax in customer receipts
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.enable_itemized_tax_invoice)}
                  onValueChange={(v) => updateField('enable_itemized_tax_invoice', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>
                Invoice Terms and Conditions (Printed at bottom of bill)
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.invoice_terms_and_conditions || '')}
                onChangeText={(v) => updateField('invoice_terms_and_conditions', v)}
                placeholder="1. Goods once sold will not be returned without bill..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

          {/* TAB 3: TIMINGS & EMERGENCY PAUSE */}
          {activeTab === 'timings' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Ionicons name="time-outline" size={20} color="#ef4444" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Store Timings & Emergency Pause</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Operating hours by day and instant order pause switches
                  </Text>
                </View>
              </View>

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: '#ef4444' }]}>Emergency Order Pause</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Instantly freeze incoming orders with custom alert message
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.is_emergency_paused)}
                  onValueChange={(v) => updateField('is_emergency_paused', v)}
                  trackColor={{ false: '#334155', true: '#ef4444' }}
                />
              </View>

              {Boolean(settings.is_emergency_paused) && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Emergency Pause Message</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.emergency_pause_message || '')}
                    onChangeText={(v) => updateField('emergency_pause_message', v)}
                    placeholder="We are experiencing very high order volume and will resume shortly..."
                    placeholderTextColor={colors.textMuted}
                  />
                </>
              )}

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Auto-Cutoff Outside Operating Hours</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Automatically close store and prevent orders outside daily schedule
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.auto_cutoff_orders)}
                  onValueChange={(v) => updateField('auto_cutoff_orders', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={[styles.sectionHeading, { color: colors.text }]}>Weekly Operating Schedule</Text>

              {DAYS_OF_WEEK.map((day) => {
                const dayData = settings.store_timings_json?.[day] || {
                  open: '08:00',
                  close: '21:00',
                  is_closed: false,
                };
                const dayLabel = day.charAt(0).toUpperCase() + day.slice(1);

                return (
                  <View
                    key={day}
                    style={[styles.dayRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  >
                    <View style={styles.dayLabelCol}>
                      <Text style={[styles.dayTitle, { color: colors.text }]}>{dayLabel}</Text>
                      <Text style={[styles.dayStatus, { color: dayData.is_closed ? '#ef4444' : '#10b981' }]}>
                        {dayData.is_closed ? 'Closed' : `${dayData.open} - ${dayData.close}`}
                      </Text>
                    </View>

                    <View style={styles.dayInputsCol}>
                      {!dayData.is_closed && (
                        <View style={styles.timeInputsRow}>
                          <TextInput
                            style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={dayData.open || '08:00'}
                            onChangeText={(val) => handleTimingChange(day, 'open', val)}
                            placeholder="08:00"
                            placeholderTextColor={colors.textMuted}
                          />
                          <Text style={{ color: colors.textMuted }}>to</Text>
                          <TextInput
                            style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                            value={dayData.close || '21:00'}
                            onChangeText={(val) => handleTimingChange(day, 'close', val)}
                            placeholder="21:00"
                            placeholderTextColor={colors.textMuted}
                          />
                        </View>
                      )}

                      <View style={styles.closedSwitchWrap}>
                        <Text style={[styles.closedText, { color: colors.textMuted }]}>Closed</Text>
                        <Switch
                          value={Boolean(dayData.is_closed)}
                          onValueChange={(val) => handleTimingChange(day, 'is_closed', val)}
                          trackColor={{ false: '#334155', true: '#ef4444' }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 4: DELIVERY SLOTS */}
          {activeTab === 'slots' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Ionicons name="calendar-outline" size={20} color="#a855f7" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Delivery & Pickup Time Slots</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Define customer order fulfillment windows
                  </Text>
                </View>
              </View>

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Enable Time Slots at Checkout</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Let customers choose preferred delivery/pickup windows
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.enable_time_slots)}
                  onValueChange={(v) => updateField('enable_time_slots', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Max Orders Per Slot</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings.max_orders_per_slot ?? '15')}
                    onChangeText={(v) => updateField('max_orders_per_slot', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Preparation Buffer (Mins)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings.preparation_buffer_minutes ?? '30')}
                    onChangeText={(v) => updateField('preparation_buffer_minutes', v)}
                  />
                </View>
              </View>

              {/* Slot Management List */}
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Active Delivery Slots</Text>

              {Array.isArray(settings.time_slots_json) && settings.time_slots_json.length > 0 ? (
                settings.time_slots_json.map((slot: any, idx: number) => (
                  <View
                    key={slot.id || idx}
                    style={[styles.slotItem, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                  >
                    <View style={styles.slotInfo}>
                      <View style={styles.slotBadge}>
                        <Text style={styles.slotBadgeText}>
                          {slot.start_time || '00:00'} - {slot.end_time || '00:00'}
                        </Text>
                      </View>
                      <Text style={[styles.slotLabel, { color: colors.text }]}>
                        {slot.label || 'Standard Slot'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.slotDeleteBtn}
                      onPress={() => handleRemoveSlot(idx)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptySlotsText, { color: colors.textMuted }]}>
                  No custom slots created yet. Add one below.
                </Text>
              )}

              {/* Add New Slot Form */}
              <View style={[styles.addSlotBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Text style={[styles.addSlotTitle, { color: colors.text }]}>Add New Time Slot</Text>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Start Time</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={newSlotStart}
                      onChangeText={setNewSlotStart}
                      placeholder="09:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>End Time</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                      value={newSlotEnd}
                      onChangeText={setNewSlotEnd}
                      placeholder="12:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: colors.textMuted }]}>Slot Display Label</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  value={newSlotLabel}
                  onChangeText={setNewSlotLabel}
                  placeholder="e.g. Morning Express (9 AM - 12 PM)"
                  placeholderTextColor={colors.textMuted}
                />

                <TouchableOpacity
                  style={[styles.addSlotBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleAddSlot}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addSlotBtnText}>Add Slot</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 5: WHATSAPP SUPPORT */}
          {activeTab === 'whatsapp' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                  <Ionicons name="logo-whatsapp" size={20} color="#22c55e" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>WhatsApp Live Support</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Floating customer chat button & order assistance templates
                  </Text>
                </View>
              </View>

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Enable WhatsApp Support Button</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Show floating WhatsApp button on customer app & website
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.enable_whatsapp_support)}
                  onValueChange={(v) => updateField('enable_whatsapp_support', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>Store WhatsApp Number (with country code)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                keyboardType="phone-pad"
                value={String(settings.whatsapp_number || '')}
                onChangeText={(v) => updateField('whatsapp_number', v)}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>Default Support Greeting Message</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.whatsapp_default_message || '')}
                onChangeText={(v) => updateField('whatsapp_default_message', v)}
                placeholder="Hi Narendra Kirana, I need help with my grocery order."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>
                Order Help Template (Use {'{order_id}'} placeholder)
              </Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.whatsapp_order_help_template || '')}
                onChangeText={(v) => updateField('whatsapp_order_help_template', v)}
                placeholder="Hi Narendra Kirana, I need help with Order #{order_id}"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* TAB 6: WALLET & CASHBACK */}
          {activeTab === 'loyalty' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                  <Ionicons name="gift-outline" size={20} color="#eab308" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Loyalty Wallet & Referral Rewards</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Cashback on completed orders and invite bonuses
                  </Text>
                </View>
              </View>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Order Cashback (%)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings.order_cashback_percentage ?? '2.00')}
                    onChangeText={(v) => updateField('order_cashback_percentage', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Max Wallet Usage (%)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings.max_wallet_usage_percentage ?? '50')}
                    onChangeText={(v) => updateField('max_wallet_usage_percentage', v)}
                  />
                </View>
              </View>

              <Text style={[styles.sectionHeading, { color: colors.text }]}>Referral Program Incentives</Text>

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Referrer Bonus (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings.referral_bonus_referrer ?? '50.00')}
                    onChangeText={(v) => updateField('referral_bonus_referrer', v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Friend Bonus (₹)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings.referral_bonus_referee ?? '50.00')}
                    onChangeText={(v) => updateField('referral_bonus_referee', v)}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>Min Order Amount to Unlock Referral (₹)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                value={String(settings.referral_min_order_amount ?? '200.00')}
                onChangeText={(v) => updateField('referral_min_order_amount', v)}
              />
            </View>
          )}

          {/* TAB 7: ANNOUNCEMENTS & FESTIVE */}
          {activeTab === 'announcements' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                  <Ionicons name="megaphone-outline" size={20} color="#ec4899" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Marquee Bar & Festive Offers</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Top announcement ticker and special seasonal popup modals
                  </Text>
                </View>
              </View>

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Top Marquee Announcement Bar</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Displays a scrolling or sticky announcement at the top of the storefront
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.enable_announcement_bar)}
                  onValueChange={(v) => updateField('enable_announcement_bar', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              {Boolean(settings.enable_announcement_bar) && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Announcement Text</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.announcement_text || '')}
                    onChangeText={(v) => updateField('announcement_text', v)}
                    placeholder="🎉 Free Home Delivery on orders above ₹499! Use code FIRST50."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>Background Color</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                        value={String(settings.announcement_bg_color || '#16a34a')}
                        onChangeText={(v) => updateField('announcement_bg_color', v)}
                        placeholder="#16a34a"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>Text Color</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                        value={String(settings.announcement_text_color || '#ffffff')}
                        onChangeText={(v) => updateField('announcement_text_color', v)}
                        placeholder="#ffffff"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Live Preview Bar */}
                  <View
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      backgroundColor: settings.announcement_bg_color || '#16a34a',
                      marginBottom: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        color: settings.announcement_text_color || '#ffffff',
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                      numberOfLines={1}
                    >
                      {settings.announcement_text || 'Announcement ticker preview text...'}
                    </Text>
                  </View>

                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>Start Schedule (Optional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                        value={String(settings.announcement_start_date || '')}
                        onChangeText={(v) => updateField('announcement_start_date', v)}
                        placeholder="YYYY-MM-DDTHH:mm"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.label, { color: colors.textMuted }]}>End Schedule (Optional)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                        value={String(settings.announcement_end_date || '')}
                        onChangeText={(v) => updateField('announcement_end_date', v)}
                        placeholder="YYYY-MM-DDTHH:mm"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Festive / Special Announcement Popup</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Modal greeting popup shown to customers when opening the app
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.enable_festive_popup)}
                  onValueChange={(v) => updateField('enable_festive_popup', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              {Boolean(settings.enable_festive_popup) && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Festive Popup Title</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.festive_popup_title || '')}
                    onChangeText={(v) => updateField('festive_popup_title', v)}
                    placeholder="Special Festive Offer! 🪔"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={[styles.label, { color: colors.textMuted }]}>Festive Popup Content</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.festive_popup_content || '')}
                    onChangeText={(v) => updateField('festive_popup_content', v)}
                    placeholder="Enjoy huge discounts on all grocery essentials today!"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={[styles.label, { color: colors.textMuted }]}>Festive Banner Image</Text>
                  {festiveImageUri ? (
                    <View style={[styles.imagePreviewBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Image source={{ uri: festiveImageUri }} style={styles.bannerImage} contentFit="cover" />
                      <View style={styles.imageActionRow}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#10b981' }]}
                          onPress={() =>
                            pickImageFile((uri) => {
                              setFestiveImageUri(uri);
                              setFestiveImageChanged(true);
                            }, [16, 9])
                          }
                        >
                          <Ionicons name="image-outline" size={14} color="#fff" />
                          <Text style={styles.smallBtnText}>Replace Banner</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#ef4444' }]}
                          onPress={() => {
                            setFestiveImageUri(null);
                            setFestiveImageChanged(true);
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#fff" />
                          <Text style={styles.smallBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.imagePlaceholder, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                      onPress={() =>
                        pickImageFile((uri) => {
                          setFestiveImageUri(uri);
                          setFestiveImageChanged(true);
                        }, [16, 9])
                      }
                    >
                      <Ionicons name="image-outline" size={28} color="#ec4899" />
                      <Text style={[styles.imagePlaceholderTitle, { color: colors.text }]}>Upload Festive Banner</Text>
                      <Text style={[styles.imagePlaceholderSub, { color: colors.textMuted }]}>
                        Tap to select banner graphic (16:9 recommended)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}

          {/* TAB 8: MOBILE APP VERSION & MAINTENANCE */}
          {activeTab === 'mobile' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="phone-portrait-outline" size={20} color="#38bdf8" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Mobile App & Maintenance</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Release versions, mandatory upgrades, and scheduled maintenance
                  </Text>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>App Brand Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.app_name || '')}
                onChangeText={(v) => updateField('app_name', v)}
                placeholder="Narendra Kirana"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Min Required Version</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.min_mobile_version || '1.0.0')}
                    onChangeText={(v) => updateField('min_mobile_version', v)}
                    placeholder="1.0.0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Latest Released Version</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.latest_mobile_version || '1.0.0')}
                    onChangeText={(v) => updateField('latest_mobile_version', v)}
                    placeholder="1.0.0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>Force Immediate App Update</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Block customer app until user upgrades to latest version
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.force_app_update)}
                  onValueChange={(v) => updateField('force_app_update', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={[styles.label, { color: colors.textMuted }]}>Direct APK Download / Store URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                autoCapitalize="none"
                value={String(settings.app_update_url || '')}
                onChangeText={(v) => updateField('app_update_url', v)}
                placeholder="https://github.com/.../narendra-kirana.apk"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textMuted }]}>App Update Announcement Notice</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                value={String(settings.app_update_message || '')}
                onChangeText={(v) => updateField('app_update_message', v)}
                placeholder="A new version of Narendra Kirana is available. Please update."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={[styles.switchCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchLabel, { color: '#f59e0b' }]}>Storefront Maintenance Mode</Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Display maintenance screen to customers while backend undergoes maintenance
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings.is_maintenance_mode)}
                  onValueChange={(v) => updateField('is_maintenance_mode', v)}
                  trackColor={{ false: '#334155', true: '#f59e0b' }}
                />
              </View>

              {Boolean(settings.is_maintenance_mode) && (
                <>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Maintenance Notice Message</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.maintenance_message || '')}
                    onChangeText={(v) => updateField('maintenance_message', v)}
                    placeholder="We are currently performing maintenance. Back online shortly!"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={2}
                  />

                  <Text style={[styles.label, { color: colors.textMuted }]}>Estimated Completion Time (Optional)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                    value={String(settings.maintenance_estimated_end || '')}
                    onChangeText={(v) => updateField('maintenance_estimated_end', v)}
                    placeholder="YYYY-MM-DDTHH:mm"
                    placeholderTextColor={colors.textMuted}
                  />
                </>
              )}
            </View>
          )}

          {/* TAB 9: DATA & BACKUP */}
          {activeTab === 'backup' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                  <Ionicons name="server-outline" size={20} color="#6366f1" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Database Records & Offline Backup</Text>
                  <Text style={[styles.cardSub, { color: colors.textMuted }]}>
                    Export full store catalog, orders, and customer databases
                  </Text>
                </View>
              </View>

              {/* Live Database Stats Cards */}
              <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: '#10b981' }]}>
                    {backupStats?.products_count ?? '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Products</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: '#3b82f6' }]}>
                    {backupStats?.categories_count ?? '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Categories</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                    {backupStats?.orders_count ?? '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Orders</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: '#a855f7' }]}>
                    {backupStats?.users_count ?? '—'}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Customers</Text>
                </View>
              </View>

              <View style={[styles.engineInfoRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <Ionicons name="shield-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.engineInfoText, { color: colors.textMuted }]}>
                  Database Engine: {backupStats?.database || 'PostgreSQL'}
                </Text>
                <TouchableOpacity onPress={fetchBackupStats} disabled={loadingBackupStats} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="refresh" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Download Backup Button */}
              <TouchableOpacity
                style={[styles.backupDownloadBtn, { backgroundColor: '#10b981' }]}
                onPress={handleDownloadBackup}
                disabled={downloadingBackup}
              >
                {downloadingBackup ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={20} color="#fff" />
                    <Text style={styles.backupDownloadBtnText}>
                      Export & Download Complete Store Backup
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.backupNotice, { color: colors.textMuted }]}>
                The backup file is saved as a complete, encrypted JSON archive containing all products,
                categories, orders, customers, and store configurations.
              </Text>
            </View>
          )}

          {/* Bottom Save Button for all tabs */}
          {activeTab !== 'backup' && (
            <TouchableOpacity
              style={[styles.saveAllBtn, { backgroundColor: '#10b981' }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.saveAllBtnText}>Save Advanced Settings</Text>
                </>
              )}
            </TouchableOpacity>
          )}

        </View>
      </ScrollView>
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
    gap: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveHeaderBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  tabBar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tabScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabPillText: {
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  multilineInput: {
    minHeight: 70,
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
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  dayLabelCol: {
    minWidth: 100,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  dayStatus: {
    fontSize: 11,
    marginTop: 1,
    fontWeight: '500',
  },
  dayInputsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    width: 65,
    textAlign: 'center',
  },
  closedSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  closedText: {
    fontSize: 12,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  slotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  slotBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  slotLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  slotDeleteBtn: {
    padding: 6,
  },
  emptySlotsText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  addSlotBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
    gap: 8,
  },
  addSlotTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  addSlotBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  imagePreviewBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  squareImage: {
    width: 140,
    height: 140,
    borderRadius: 8,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  imageActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    padding: 24,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  imagePlaceholderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  imagePlaceholderSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  engineInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
  engineInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  backupDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 6,
  },
  backupDownloadBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  backupNotice: {
    fontSize: 12,
    lineHeight: 18,
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
});
