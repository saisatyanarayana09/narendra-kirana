import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useRouter } from 'expo-router';
import { showAlert } from '../../../utils/alerts';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    store_name: '',
    store_phone: '',
    store_email: '',
    store_address: '',
    is_open: true,
    auto_accept_orders: false,
    min_order_amount: '0.00',
    packaging_fee: '0.00',
    is_home_delivery_active: false,
    delivery_fee: '0.00',
    free_delivery_threshold: '0.00',
    min_delivery_order_amount: '150.00',
    allowed_pincodes: '',
    enforce_delivery_radius: false,
    show_popular_picks: true,
    show_great_deals: true,
    show_new_arrivals: true,
  });

  useEffect(() => {
    let isMounted = true;
    api
      .get('/store/settings/')
      .then((res) => {
        if (isMounted && res?.data) {
          setForm((prev: any) => ({ ...prev, ...res.data }));
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

  const updateField = (key: string, val: any) => {
    setForm((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/store/settings/', {
        store_name: String(form.store_name || '').trim(),
        store_phone: String(form.store_phone || '').trim(),
        store_email: String(form.store_email || '').trim(),
        store_address: String(form.store_address || '').trim(),
        is_open: Boolean(form.is_open),
        auto_accept_orders: Boolean(form.auto_accept_orders),
        min_order_amount: form.min_order_amount,
        packaging_fee: form.packaging_fee,
        is_home_delivery_active: Boolean(form.is_home_delivery_active),
        delivery_fee: form.delivery_fee,
        free_delivery_threshold: form.free_delivery_threshold,
        min_delivery_order_amount: form.min_delivery_order_amount,
        allowed_pincodes: String(form.allowed_pincodes || '').trim(),
        enforce_delivery_radius: Boolean(form.enforce_delivery_radius),
        show_popular_picks: Boolean(form.show_popular_picks),
        show_great_deals: Boolean(form.show_great_deals),
        show_new_arrivals: Boolean(form.show_new_arrivals),
      });
      (api as ApiInstance).clearCache();
      showAlert('Success', 'Store settings saved successfully', () => router.back());
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save settings'));
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Store Profile & Status</Text>

        <View style={styles.row}>
          <Text style={styles.switchLabel}>Accepting Orders (Store Open)</Text>
          <Switch
            value={Boolean(form.is_open)}
            onValueChange={(v) => updateField('is_open', v)}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.switchLabel}>Auto-Accept Incoming Orders</Text>
          <Switch
            value={Boolean(form.auto_accept_orders)}
            onValueChange={(v) => updateField('auto_accept_orders', v)}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <Text style={styles.label}>Store Name</Text>
        <TextInput
          style={styles.input}
          value={String(form.store_name || '')}
          onChangeText={(v) => updateField('store_name', v)}
          placeholder="Narendra Kirana"
          placeholderTextColor="#64748b"
        />

        <Text style={styles.label}>Store Contact Phone</Text>
        <TextInput
          style={styles.input}
          value={String(form.store_phone || '')}
          onChangeText={(v) => updateField('store_phone', v)}
          placeholder="+91 9876543210"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Store Email</Text>
        <TextInput
          style={styles.input}
          value={String(form.store_email || '')}
          onChangeText={(v) => updateField('store_email', v)}
          placeholder="owner@example.com"
          placeholderTextColor="#64748b"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Store Address</Text>
        <TextInput
          style={styles.input}
          value={String(form.store_address || '')}
          onChangeText={(v) => updateField('store_address', v)}
          placeholder="Full store address"
          placeholderTextColor="#64748b"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Delivery & Order Fees</Text>

        <View style={styles.row}>
          <Text style={styles.switchLabel}>Enable Home Delivery</Text>
          <Switch
            value={Boolean(form.is_home_delivery_active)}
            onValueChange={(v) => updateField('is_home_delivery_active', v)}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.switchLabel}>Enforce Geofence Radius</Text>
          <Switch
            value={Boolean(form.enforce_delivery_radius)}
            onValueChange={(v) => updateField('enforce_delivery_radius', v)}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Min Order (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(form.min_order_amount ?? '0')}
              onChangeText={(v) => updateField('min_order_amount', v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Packaging Fee (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(form.packaging_fee ?? '0')}
              onChangeText={(v) => updateField('packaging_fee', v)}
            />
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Delivery Fee (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(form.delivery_fee ?? '0')}
              onChangeText={(v) => updateField('delivery_fee', v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Free Delivery Above (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={String(form.free_delivery_threshold ?? '0')}
              onChangeText={(v) => updateField('free_delivery_threshold', v)}
            />
          </View>
        </View>

        <Text style={styles.label}>Allowed Pincodes (comma-separated, leave blank for all)</Text>
        <TextInput
          style={styles.input}
          placeholder="500001, 500002"
          placeholderTextColor="#64748b"
          value={String(form.allowed_pincodes || '')}
          onChangeText={(v) => updateField('allowed_pincodes', v)}
        />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save All Store Settings</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  label: {
    color: '#94a3b8',
    marginBottom: 6,
    fontSize: 13,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
