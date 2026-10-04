import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';
import ModernSwitch from '../../../components/ModernSwitch';

export default function OffersScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [promos, setPromos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create Promo Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchOffers = useCallback(async () => {
    try {
      const [promosRes, catsRes] = await Promise.allSettled([
        api.get('/offers/promocodes/'),
        api.get('/categories/'),
      ]);

      if (promosRes.status === 'fulfilled') {
        const raw = promosRes.value?.data?.results ?? promosRes.value?.data;
        setPromos(Array.isArray(raw) ? raw : []);
      }
      if (catsRes.status === 'fulfilled') {
        const rawCats = catsRes.value?.data?.results ?? catsRes.value?.data;
        setCategories(Array.isArray(rawCats) ? rawCats : []);
      }
    } catch {
      // Handled per-promise
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers();
  }, [fetchOffers]);

  const generateRandomCode = () => {
    const prefixes = ['SAVE', 'KIRANA', 'SUPER', 'DEAL', 'SPECIAL', 'FESTIVE'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = [10, 15, 20, 25, 50, 100][Math.floor(Math.random() * 6)];
    setCode(`${prefix}${num}`);
    if (num <= 50) {
      setDiscountType('PERCENTAGE');
      setDiscountValue(String(num));
    } else {
      setDiscountType('FIXED');
      setDiscountValue(String(num));
    }
  };

  const handleCopyCode = async (couponCode: string) => {
    try {
      await Clipboard.setStringAsync(couponCode);
      setCopiedCode(couponCode);
      setTimeout(() => {
        setCopiedCode(null);
      }, 2000);
    } catch {
      showAlert('Notice', 'Failed to copy coupon code.');
    }
  };

  const handleCreatePromo = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showAlert('Validation', 'Please enter a coupon code.');
      return;
    }
    const cleanVal = parseFloat(discountValue);
    if (isNaN(cleanVal) || cleanVal <= 0) {
      showAlert('Validation', 'Please enter a valid discount value greater than 0.');
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

      setModalOpen(false);
      setCode('');
      setDiscountValue('');
      setMinOrderAmount('0');
      setSelectedCategory(null);
      setIsActive(true);

      await fetchOffers();
      showAlert('Success', `Promo code "${cleanCode}" created successfully!`);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create promo code. Code must be unique.'));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePromo = async (promo: any) => {
    const nextStatus = !promo.is_active;
    // 0ms Optimistic Update
    setPromos((prev) =>
      prev.map((p) => (p.id === promo.id ? { ...p, is_active: nextStatus } : p))
    );

    try {
      await api.patch(`/offers/promocodes/${promo.id}/`, {
        is_active: nextStatus,
      });
      (api as ApiInstance).clearCache();
    } catch (e: any) {
      // Revert on error
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: !nextStatus } : p))
      );
      showAlert('Error', getErrorMessage(e, 'Failed to toggle promo code.'));
    }
  };

  const handleDeletePromo = (id: number, promoCode: string) => {
    showConfirm(
      'Delete Promo Code',
      `Are you sure you want to delete "${promoCode}"? Customers will no longer be able to redeem it.`,
      async () => {
        try {
          await api.delete(`/offers/promocodes/${id}/`);
          (api as ApiInstance).clearCache();
          setPromos((prev) => prev.filter((p) => p.id !== id));
          showAlert('Deleted', `Promo code "${promoCode}" removed.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to delete promo code.'));
        }
      },
      undefined,
      'Delete'
    );
  };

  const filteredPromos = useMemo(() => {
    let list = promos;
    if (activeFilter === 'ACTIVE') {
      list = list.filter((p) => Boolean(p.is_active));
    } else if (activeFilter === 'INACTIVE') {
      list = list.filter((p) => !p.is_active);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((p) => (p.code || '').toLowerCase().includes(q));
    }
    return list;
  }, [promos, activeFilter, searchQuery]);

  const activeCount = useMemo(
    () => promos.filter((p) => Boolean(p.is_active)).length,
    [promos]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Coupons & Offers"
        subtitle={`${promos.length} codes • ${activeCount} active`}
        rightAction={
          <TouchableOpacity
            style={styles.addHeaderBtn}
            onPress={() => setModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Create Coupon"
          >
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addHeaderBtnText}>Add Code</Text>
          </TouchableOpacity>
        }
      />

      {/* Cross-Link Card to Visual Showcase (Eliminates banner confusion) */}
      <TouchableOpacity
        style={[
          styles.showcaseShortcut,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/more/showcase' as any)}
      >
        <View style={styles.shortcutLeft}>
          <View style={[styles.shortcutIconBox, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
            <Ionicons name="images-outline" size={18} color="#ec4899" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.shortcutTitle, { color: colors.text }]}>
              Homepage Hero Banners & Showcase
            </Text>
            <Text style={[styles.shortcutSub, { color: colors.textMuted }]}>
              Manage graphic carousel banners in Showcase
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Filter Tabs & Search */}
      <View style={styles.toolbar}>
        <View style={styles.filterTabs}>
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((f) => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: active
                      ? isDark
                        ? '#064e3b'
                        : '#d1fae5'
                      : colors.card,
                    borderColor: active ? '#10b981' : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(f)}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    {
                      color: active ? '#10b981' : colors.textMuted,
                      fontWeight: active ? '800' : '600',
                    },
                  ]}
                >
                  {f === 'ALL' ? 'All' : f === 'ACTIVE' ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search code..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Promos List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading promo codes...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPromos}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          renderItem={({ item }) => {
            const isPercentage = item?.discount_type === 'PERCENTAGE';
            const isCopied = copiedCode === item.code;

            return (
              <View
                style={[
                  styles.promoCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Left Ticket Stub */}
                <View style={styles.cardHeaderRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.codePill,
                      { backgroundColor: colors.cardAlt, borderColor: colors.border },
                    ]}
                    onPress={() => handleCopyCode(item.code)}
                  >
                    <Ionicons name="ticket-outline" size={16} color="#10b981" />
                    <Text style={[styles.codeText, { color: colors.text }]}>
                      {item.code}
                    </Text>
                    <Ionicons
                      name={isCopied ? 'checkmark-circle' : 'copy-outline'}
                      size={14}
                      color={isCopied ? '#10b981' : colors.textMuted}
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.discountBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : '#ecfdf5',
                      },
                    ]}
                  >
                    <Text style={styles.discountBadgeText}>
                      {isPercentage
                        ? `${item?.discount_value}% OFF`
                        : `₹${item?.discount_value} FLAT OFF`}
                    </Text>
                  </View>
                </View>

                {/* Sub details */}
                <View style={styles.rulesRow}>
                  <Text style={[styles.ruleText, { color: colors.textMuted }]}>
                    Min order: ₹{item?.min_order_amount ?? 0}
                  </Text>
                  {item?.applicable_category_name && (
                    <Text style={[styles.ruleText, { color: colors.textMuted }]}>
                      • On: {item.applicable_category_name}
                    </Text>
                  )}
                  {item?.max_discount && (
                    <Text style={[styles.ruleText, { color: colors.textMuted }]}>
                      • Max discount: ₹{item.max_discount}
                    </Text>
                  )}
                </View>

                {/* Footer with ModernSwitch & Delete */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.statusWrap}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: item.is_active ? '#10b981' : '#64748b' },
                      ]}
                    />
                    <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
                      {item.is_active ? 'Active & Redeemable' : 'Disabled'}
                    </Text>
                  </View>

                  <View style={styles.cardActions}>
                    <ModernSwitch
                      value={Boolean(item.is_active)}
                      onValueChange={() => handleTogglePromo(item)}
                    />

                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                      onPress={() => handleDeletePromo(item.id, item.code)}
                      accessibilityLabel="Delete promo code"
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.cardAlt }]}>
                <Ionicons name="pricetag-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery ? 'No coupons matched' : 'No promo codes created'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {searchQuery
                  ? 'Try searching with another keyword'
                  : 'Delight customers and boost basket size with coupon discounts'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => setModalOpen(true)}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.emptyActionBtnText}>Create First Coupon</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Bottom Sheet Modal for Creating Coupon */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setModalOpen(false)}
          />
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Create Promo Coupon
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Set discounts, minimum order threshold & validity
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeCircle, { backgroundColor: colors.cardAlt }]}
                onPress={() => setModalOpen(false)}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Promo Code Input & Random Generator */}
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Coupon Code *
                </Text>
                <TouchableOpacity onPress={generateRandomCode} style={styles.magicBtn}>
                  <Ionicons name="sparkles-outline" size={13} color="#10b981" />
                  <Text style={styles.magicBtnText}>Auto-Suggest</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.cardAlt,
                    borderColor: colors.border,
                    color: colors.text,
                    fontWeight: '800',
                  },
                ]}
                placeholder="e.g. FESTIVE20, SAVE50"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
              />

              {/* Discount Type Selector */}
              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                Discount Type
              </Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor:
                        discountType === 'PERCENTAGE' ? '#10b981' : colors.cardAlt,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setDiscountType('PERCENTAGE')}
                >
                  <Ionicons
                    name="pie-chart-outline"
                    size={16}
                    color={discountType === 'PERCENTAGE' ? '#fff' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: discountType === 'PERCENTAGE' ? '#fff' : colors.text },
                    ]}
                  >
                    Percentage (% OFF)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor:
                        discountType === 'FIXED' ? '#10b981' : colors.cardAlt,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setDiscountType('FIXED')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={discountType === 'FIXED' ? '#fff' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      { color: discountType === 'FIXED' ? '#fff' : colors.text },
                    ]}
                  >
                    Flat Cash (₹ OFF)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Value & Min Order In 2 Columns */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                    {discountType === 'PERCENTAGE' ? 'Discount % *' : 'Amount ₹ *'}
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder={discountType === 'PERCENTAGE' ? '20' : '50'}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                    Min Order (₹)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={minOrderAmount}
                    onChangeText={setMinOrderAmount}
                  />
                </View>
              </View>

              {/* Applicable Category */}
              {categories.length > 0 && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 14 }]}>
                    Applicable Category (Optional)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catChipsRow}
                  >
                    <TouchableOpacity
                      style={[
                        styles.catChip,
                        {
                          backgroundColor:
                            selectedCategory === null ? '#10b981' : colors.cardAlt,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() => setSelectedCategory(null)}
                    >
                      <Text
                        style={[
                          styles.catChipText,
                          { color: selectedCategory === null ? '#fff' : colors.text },
                        ]}
                      >
                        All Products
                      </Text>
                    </TouchableOpacity>
                    {categories.map((c) => {
                      const sel = selectedCategory === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.catChip,
                            {
                              backgroundColor: sel ? '#10b981' : colors.cardAlt,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => setSelectedCategory(sel ? null : c.id)}
                        >
                          <Text
                            style={[
                              styles.catChipText,
                              { color: sel ? '#fff' : colors.text },
                            ]}
                          >
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              {/* Active Immediately Switch */}
              <View
                style={[
                  styles.switchRow,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border, marginTop: 16 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchTitle, { color: colors.text }]}>
                    Active Immediately
                  </Text>
                  <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                    Allow customers to enter and apply this coupon at checkout
                  </Text>
                </View>
                <ModernSwitch value={isActive} onValueChange={setIsActive} />
              </View>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                  onPress={() => setModalOpen(false)}
                  disabled={saving}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
                  onPress={handleCreatePromo}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Save Coupon</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  addHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addHeaderBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  showcaseShortcut: {
    marginHorizontal: 14,
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shortcutLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shortcutIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  shortcutSub: {
    fontSize: 10,
    marginTop: 1,
  },
  toolbar: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
  },
  promoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  discountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  rulesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  magicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  magicBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  catChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
