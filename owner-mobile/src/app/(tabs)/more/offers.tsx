import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function OffersScreen() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Promo form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const res = await api.get('/offers/promocodes/');
      const raw = res?.data?.results ?? res?.data;
      setPromos(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(e, 'Failed to load promo codes.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleCreatePromo = async () => {
    const cleanCode = code.trim().toUpperCase();
    const cleanVal = discountValue.trim();

    if (!cleanCode || !cleanVal) {
      showAlert('Validation', 'Promo code and discount value are required.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/offers/promocodes/', {
        code: cleanCode,
        discount_type: discountType,
        discount_value: cleanVal,
        min_order_amount: minOrderAmount.trim() || '0',
        is_active: isActive,
      });
      setCode('');
      setDiscountValue('');
      setMinOrderAmount('0');
      setIsActive(true);
      await fetchOffers();
      showAlert('Success', `Promo code ${cleanCode} created!`);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create promo code.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePromo = (id: number, promoCode: string) => {
    showConfirm(
      'Delete Promo Code',
      `Delete promo code "${promoCode}"?`,
      async () => {
        try {
          await api.delete(`/offers/promocodes/${id}/`);
          fetchOffers();
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to delete promo code.'));
        }
      },
      undefined,
      'Delete'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Create Promo Code</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="CODE (e.g. SAVE10)"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[styles.typeBtn, discountType === 'PERCENTAGE' && styles.typeBtnActive]}
              onPress={() => setDiscountType('PERCENTAGE')}
            >
              <Text style={styles.typeBtnText}>%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, discountType === 'FLAT' && styles.typeBtnActive]}
              onPress={() => setDiscountType('FLAT')}
            >
              <Text style={styles.typeBtnText}>₹</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder={discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount ₹'}
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={discountValue}
            onChangeText={setDiscountValue}
          />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Min Order ₹ (0)"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={minOrderAmount}
            onChangeText={setMinOrderAmount}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Active Immediately</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleCreatePromo} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Add Promo Code</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={promos}
          keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `promo-${idx}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchOffers();
              }}
              tintColor="#10b981"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <View style={styles.codeRow}>
                  <Text style={styles.promoCode}>{item?.code}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: item?.is_active ? '#059669' : '#475569' },
                    ]}
                  >
                    <Text style={styles.badgeText}>{item?.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                  </View>
                </View>
                <Text style={styles.promoDesc}>
                  {item?.discount_type === 'PERCENTAGE'
                    ? `${item?.discount_value}% OFF`
                    : `₹${item?.discount_value} FLAT OFF`}{' '}
                  • Min Order: ₹{item?.min_order_amount ?? 0}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePromo(item.id, item.code)}
              >
                <Ionicons name="trash" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No promo codes created yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  formCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  formTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  typeBtn: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#10b981',
  },
  typeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  createBtn: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  promoCode: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  promoDesc: {
    color: '#94a3b8',
    fontSize: 13,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: '#0f172a',
    borderRadius: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
  },
});
