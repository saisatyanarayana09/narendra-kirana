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
} from 'react-native';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { showAlert } from '../../../utils/alerts';

type SectionTab = 'payments' | 'operations' | 'slots' | 'loyalty' | 'promo';

export default function AdvancedSettingsScreen() {
  const [activeTab, setActiveTab] = useState<SectionTab>('payments');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<any>({
    upi_id: '',
    upi_payee_name: '',
    enable_dynamic_upi_qr: true,
    fssai_license_number: '',
    gstin: '',
    enable_itemized_tax_invoice: true,
    is_emergency_paused: false,
    emergency_pause_message: '',
    auto_cutoff_orders: true,
    enable_time_slots: true,
    preparation_buffer_minutes: '30',
    max_orders_per_slot: '15',
    enable_whatsapp_support: true,
    whatsapp_number: '',
    order_cashback_percentage: '2.00',
    max_wallet_usage_percentage: '50',
    enable_announcement_bar: true,
    announcement_text: '',
    is_maintenance_mode: false,
    maintenance_message: '',
  });

  useEffect(() => {
    let isMounted = true;
    api
      .get('/store/settings/')
      .then((res) => {
        if (isMounted && res?.data) {
          setSettings((prev: any) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateField = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        upi_id: settings.upi_id,
        upi_payee_name: settings.upi_payee_name,
        enable_dynamic_upi_qr: Boolean(settings.enable_dynamic_upi_qr),
        fssai_license_number: settings.fssai_license_number,
        gstin: settings.gstin,
        enable_itemized_tax_invoice: Boolean(settings.enable_itemized_tax_invoice),
        is_emergency_paused: Boolean(settings.is_emergency_paused),
        emergency_pause_message: settings.emergency_pause_message,
        auto_cutoff_orders: Boolean(settings.auto_cutoff_orders),
        enable_time_slots: Boolean(settings.enable_time_slots),
        preparation_buffer_minutes: Number(settings.preparation_buffer_minutes) || 30,
        max_orders_per_slot: Number(settings.max_orders_per_slot) || 15,
        enable_whatsapp_support: Boolean(settings.enable_whatsapp_support),
        whatsapp_number: settings.whatsapp_number,
        order_cashback_percentage: settings.order_cashback_percentage,
        max_wallet_usage_percentage: Number(settings.max_wallet_usage_percentage) || 50,
        enable_announcement_bar: Boolean(settings.enable_announcement_bar),
        announcement_text: settings.announcement_text,
        is_maintenance_mode: Boolean(settings.is_maintenance_mode),
        maintenance_message: settings.maintenance_message,
      };

      await api.patch('/store/settings/', payload);
      (api as ApiInstance).clearCache();
      showAlert('Saved', 'Advanced store settings updated successfully!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save advanced settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const TABS: { key: SectionTab; label: string }[] = [
    { key: 'payments', label: 'UPI & Tax' },
    { key: 'operations', label: 'Pause & Hours' },
    { key: 'slots', label: 'Time Slots' },
    { key: 'loyalty', label: 'Cashback' },
    { key: 'promo', label: 'WhatsApp & Bar' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, activeTab === t.key && styles.tabPillActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          {activeTab === 'payments' && (
            <>
              <Text style={styles.sectionTitle}>UPI & Tax Invoicing</Text>
              <Text style={styles.label}>Store UPI ID (VPA)</Text>
              <TextInput
                style={styles.input}
                placeholder="merchant@upi"
                placeholderTextColor="#64748b"
                value={String(settings.upi_id || '')}
                onChangeText={(v) => updateField('upi_id', v)}
              />

              <Text style={styles.label}>UPI Payee Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Narendra Kirana"
                placeholderTextColor="#64748b"
                value={String(settings.upi_payee_name || '')}
                onChangeText={(v) => updateField('upi_payee_name', v)}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Dynamic UPI QR on Checkout</Text>
                <Switch
                  value={Boolean(settings.enable_dynamic_upi_qr)}
                  onValueChange={(v) => updateField('enable_dynamic_upi_qr', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={styles.label}>GSTIN Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional GSTIN"
                placeholderTextColor="#64748b"
                value={String(settings.gstin || '')}
                onChangeText={(v) => updateField('gstin', v)}
              />

              <Text style={styles.label}>FSSAI License Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional FSSAI Number"
                placeholderTextColor="#64748b"
                value={String(settings.fssai_license_number || '')}
                onChangeText={(v) => updateField('fssai_license_number', v)}
              />
            </>
          )}

          {activeTab === 'operations' && (
            <>
              <Text style={styles.sectionTitle}>Emergency Pause & Maintenance</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Emergency Order Pause</Text>
                <Switch
                  value={Boolean(settings.is_emergency_paused)}
                  onValueChange={(v) => updateField('is_emergency_paused', v)}
                  trackColor={{ false: '#334155', true: '#ef4444' }}
                />
              </View>

              <Text style={styles.label}>Emergency Pause Message</Text>
              <TextInput
                style={styles.input}
                placeholder="High order volume, resuming shortly..."
                placeholderTextColor="#64748b"
                value={String(settings.emergency_pause_message || '')}
                onChangeText={(v) => updateField('emergency_pause_message', v)}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Auto Cutoff Outside Operating Hours</Text>
                <Switch
                  value={Boolean(settings.auto_cutoff_orders)}
                  onValueChange={(v) => updateField('auto_cutoff_orders', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Storefront Maintenance Mode</Text>
                <Switch
                  value={Boolean(settings.is_maintenance_mode)}
                  onValueChange={(v) => updateField('is_maintenance_mode', v)}
                  trackColor={{ false: '#334155', true: '#f59e0b' }}
                />
              </View>
            </>
          )}

          {activeTab === 'slots' && (
            <>
              <Text style={styles.sectionTitle}>Delivery & Pickup Slots</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Enable Delivery Time Slots</Text>
                <Switch
                  value={Boolean(settings.enable_time_slots)}
                  onValueChange={(v) => updateField('enable_time_slots', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={styles.label}>Max Orders Per Slot</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(settings.max_orders_per_slot ?? '15')}
                onChangeText={(v) => updateField('max_orders_per_slot', v)}
              />

              <Text style={styles.label}>Preparation Buffer (Minutes)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(settings.preparation_buffer_minutes ?? '30')}
                onChangeText={(v) => updateField('preparation_buffer_minutes', v)}
              />
            </>
          )}

          {activeTab === 'loyalty' && (
            <>
              <Text style={styles.sectionTitle}>Wallet & Order Cashback</Text>
              <Text style={styles.label}>Order Cashback Percentage (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(settings.order_cashback_percentage ?? '0')}
                onChangeText={(v) => updateField('order_cashback_percentage', v)}
              />

              <Text style={styles.label}>Max Wallet Usage Per Order (%)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(settings.max_wallet_usage_percentage ?? '50')}
                onChangeText={(v) => updateField('max_wallet_usage_percentage', v)}
              />
            </>
          )}

          {activeTab === 'promo' && (
            <>
              <Text style={styles.sectionTitle}>WhatsApp & Announcement Bar</Text>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Enable WhatsApp Help Button</Text>
                <Switch
                  value={Boolean(settings.enable_whatsapp_support)}
                  onValueChange={(v) => updateField('enable_whatsapp_support', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={styles.label}>Store WhatsApp Number</Text>
              <TextInput
                style={styles.input}
                placeholder="919876543210"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={String(settings.whatsapp_number || '')}
                onChangeText={(v) => updateField('whatsapp_number', v)}
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Top Announcement Bar</Text>
                <Switch
                  value={Boolean(settings.enable_announcement_bar)}
                  onValueChange={(v) => updateField('enable_announcement_bar', v)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={styles.label}>Announcement Banner Text</Text>
              <TextInput
                style={styles.input}
                placeholder="Free delivery on orders above ₹499!"
                placeholderTextColor="#64748b"
                value={String(settings.announcement_text || '')}
                onChangeText={(v) => updateField('announcement_text', v)}
              />
            </>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save Advanced Settings</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  tabBar: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 10,
  },
  tabScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0f172a',
  },
  tabPillActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    color: '#cbd5e1',
    fontSize: 15,
    flex: 1,
    marginRight: 10,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
