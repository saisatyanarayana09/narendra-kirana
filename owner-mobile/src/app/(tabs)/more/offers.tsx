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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function OffersScreen() {
  const { colors, isDark } = useAppTheme();

  const [promos, setPromos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Promo form
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FLAT'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const [promosRes, catRes] = await Promise.allSettled([
        api.get('/offers/promocodes/'),
        api.get('/categories/'),
      ]);

      if (promosRes.status === 'fulfilled' && promosRes.value?.data) {
        const raw = promosRes.value.data?.results ?? promosRes.value.data;
        setPromos(Array.isArray(raw) ? raw : []);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.data) {
        const rawC = catRes.value.data?.results ?? catRes.value.data;
        setCategories(Array.isArray(rawC) ? rawC : []);
      }
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
      const payload: any = {
        code: cleanCode,
        discount_type: discountType,
        discount_value: cleanVal,
        min_order_amount: minOrderAmount.trim() || '0',
        is_active: isActive,
      };
      if (selectedCategory) {
        payload.applicable_category = selectedCategory;
      }

      await api.post('/offers/promocodes/', payload);
      (api as ApiInstance).clearCache();
      setCode('');
      setDiscountValue('');
      setMinOrderAmount('0');
      setSelectedCategory(null);
      setIsActive(true);
      await fetchOffers();
      showAlert('Success', `Promo code "${cleanCode}" created!`);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create promo code.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePromo = async (promo: any) => {
    try {
      await api.patch(`/offers/promocodes/${promo.id}/`, {
        is_active: !promo.is_active,
      });
      (api as ApiInstance).clearCache();
      fetchOffers();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to toggle promo code.'));
    }
  };

  const handleDeletePromo = (id: number, promoCode: string) => {
    showConfirm(
      'Delete Promo Code',
      `Delete promo code "${promoCode}"?`,
      async () => {
        try {
          await api.delete(`/offers/promocodes/${id}/`);
          (api as ApiInstance).clearCache();
          fetchOffers();
          showAlert('Deleted', `Promo code "${promoCode}" removed.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to delete promo code.'));
        }
      },
      undefined,
      'Delete'
    );
  };

  const filteredPromos = promos.filter((p) => {
    if (!searchTerm.trim()) return true;
    return String(p?.code || '').toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Form Card */}
      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.formTitle, { color: colors.text }]}>Create Promo Code</Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
            placeholder="CODE (e.g. SAVE10, FESTIVE50)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            value={code}
            onChangeText={setCode}
          />

          <View style={[styles.typeSelector, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            <TouchableOpacity
              style={[styles.typeBtn, discountType === 'PERCENTAGE' && styles.typeBtnActive]}
              onPress={() => setDiscountType('PERCENTAGE')}
            >
              <Text style={[styles.typeBtnText, { color: discountType === 'PERCENTAGE' ? '#fff' : colors.text }]}>
                % Off
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, discountType === 'FLAT' && styles.typeBtnActive]}
              onPress={() => setDiscountType('FLAT')}
            >
              <Text style={[styles.typeBtnText, { color: discountType === 'FLAT' ? '#fff' : colors.text }]}>
                ₹ Flat
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
            placeholder={discountType === 'PERCENTAGE' ? 'Discount % (e.g. 10)' : 'Discount ₹ (e.g. 50)'}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={discountValue}
            onChangeText={setDiscountValue}
          />
          <TextInput
            style={[styles.input, { flex: 1, backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
            placeholder="Min Order ₹ (0)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={minOrderAmount}
            onChangeText={setMinOrderAmount}
          />
        </View>

        {/* Category restriction selector pills */}
        <Text style={[styles.sectionSubTitle, { color: colors.textMuted }]}>
          Applicable Category (Optional restriction)
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity
            style={[
              styles.catPill,
              {
                backgroundColor: selectedCategory === null ? '#10b981' : colors.cardAlt,
                borderColor: selectedCategory === null ? '#10b981' : colors.border,
              },
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.catPillText, { color: selectedCategory === null ? '#fff' : colors.text }]}>
              All Categories (Storewide)
            </Text>
          </TouchableOpacity>

          {categories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isSelected ? '#10b981' : colors.cardAlt,
                    borderColor: isSelected ? '#10b981' : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(isSelected ? null : c.id)}
              >
                <Text style={[styles.catPillText, { color: isSelected ? '#fff' : colors.text }]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: colors.text }]}>Active Immediately</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#334155', true: '#10b981' }}
          />
        </View>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: '#10b981' }]}
          onPress={handleCreatePromo}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="pricetag-outline" size={18} color="#fff" />
              <Text style={styles.createBtnText}>Add Promo Code</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Filter promo codes by name..."
          placeholderTextColor={colors.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {Boolean(searchTerm) && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filteredPromos}
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
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardInfo}>
                <View style={styles.codeRow}>
                  <Text style={[styles.promoCode, { color: colors.text }]}>{item?.code}</Text>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: item?.is_active ? '#059669' : '#475569' },
                    ]}
                  >
                    <Text style={styles.badgeText}>{item?.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
                  </View>

                  {item?.applicable_category_details ? (
                    <View style={[styles.catBadge, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                      <Text style={[styles.catBadgeText, { color: colors.textMuted }]}>
                        {item.applicable_category_details.name}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.promoDesc, { color: colors.textMuted }]}>
                  {item?.discount_type === 'PERCENTAGE'
                    ? `${item?.discount_value}% OFF`
                    : `₹${item?.discount_value} FLAT OFF`}{' '}
                  • Min Order: ₹{item?.min_order_amount ?? 0}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Switch
                  value={Boolean(item.is_active)}
                  onValueChange={() => handleTogglePromo(item)}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />

                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: colors.cardAlt }]}
                  onPress={() => handleDeletePromo(item.id, item.code)}
                >
                  <Ionicons name="trash-outline" size={17} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No promo codes created yet.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formCard: {
    padding: 16,
    borderBottomWidth: 1,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  typeBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#10b981',
  },
  typeBtnText: {
    fontWeight: '700',
    fontSize: 12,
  },
  sectionSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 2,
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 13,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: 10,
  },
  cardInfo: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  promoCode: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  promoDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
