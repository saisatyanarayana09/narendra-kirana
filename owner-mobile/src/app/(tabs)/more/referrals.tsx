import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

export default function ReferralsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'milestones'>('settings');
  const [rewardType, setRewardType] = useState<'money' | 'product'>('money');
  const [settings, setSettings] = useState<any>({
    is_active: true,
    referrer_reward: '50.00',
    referrer_reward_product: null,
    referrer_reward_product_name: '',
    require_min_spend: false,
    min_spend_amount: '0.00',
    min_spend_period: 'WEEK',
    share_text_template: 'Join Narendra Kirana with code {code} and get special discounts! {link}',
  });
  const [milestones, setMilestones] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productPickerVisible, setProductPickerVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newReqCount, setNewReqCount] = useState('');
  const [newBonusAmount, setNewBonusAmount] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [setRes, milRes, histRes, prodRes] = await Promise.allSettled([
        api.get('/offers/referral-settings/'),
        api.get('/offers/referral-milestones/'),
        api.get('/offers/referrals/'),
        api.get('/products/?limit=100'),
      ]);

      if (setRes.status === 'fulfilled' && setRes.value?.data) {
        const d = setRes.value.data;
        setSettings(d);
        if (d.referrer_reward_product) {
          setRewardType('product');
        } else {
          setRewardType('money');
        }
      }
      if (milRes.status === 'fulfilled' && milRes.value?.data) {
        const rawMil = milRes.value.data?.results ?? milRes.value.data;
        setMilestones(Array.isArray(rawMil) ? rawMil : []);
      }
      if (histRes.status === 'fulfilled' && histRes.value?.data) {
        const rawHist = histRes.value.data?.results ?? histRes.value.data;
        setHistory(Array.isArray(rawHist) ? rawHist : []);
      }
      if (prodRes.status === 'fulfilled' && prodRes.value?.data) {
        const rawProd = prodRes.value.data?.results ?? prodRes.value.data;
        setProducts(Array.isArray(rawProd) ? rawProd : []);
      }
    } catch {
      // Handled per-promise
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload: any = {
        is_active: Boolean(settings.is_active),
        referee_reward: 0,
        require_min_spend: Boolean(settings.require_min_spend),
        min_spend_amount: settings.min_spend_amount || '0.00',
        min_spend_period: settings.min_spend_period || 'WEEK',
        share_text_template: settings.share_text_template || '',
      };

      if (rewardType === 'money') {
        payload.referrer_reward = settings.referrer_reward || '0.00';
        payload.referrer_reward_product = null;
      } else {
        payload.referrer_reward = '0.00';
        payload.referrer_reward_product = settings.referrer_reward_product || null;
      }

      await api.patch('/offers/referral-settings/', payload);
      showAlert('Success', 'Referral configuration saved successfully!');
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save referral settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!newReqCount.trim() || !newBonusAmount.trim()) {
      showAlert('Validation', 'Enter both required referrals count and bonus reward amount.');
      return;
    }
    try {
      await api.post('/offers/referral-milestones/', {
        required_referrals: Number(newReqCount),
        bonus_reward: newBonusAmount.trim(),
      });
      setNewReqCount('');
      setNewBonusAmount('');
      fetchData();
      showAlert('Success', 'Milestone added!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to add milestone.'));
    }
  };

  const handleDeleteMilestone = async (id: number) => {
    showConfirm('Delete Milestone', 'Remove this bonus milestone reward?', async () => {
      try {
        await api.delete(`/offers/referral-milestones/${id}/`);
        fetchData();
        showAlert('Deleted', 'Milestone deleted.');
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to delete milestone.'));
      }
    });
  };

  const handleApprove = async (referralId: number) => {
    showConfirm('Approve Referral', 'Approve this referral and disburse reward?', async () => {
      try {
        await api.post(`/offers/referrals/${referralId}/approve/`, { token: '' });
        showAlert('Success', 'Referral reward approved!');
        fetchData();
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to approve referral. Customer QR code may be required.'));
      }
    });
  };

  const selectedProductName =
    products.find((p) => p.id === settings.referrer_reward_product)?.name ||
    settings.referrer_reward_product_name ||
    'Select a product';

  const filteredProducts = products.filter((p) =>
    (p.name || '').toLowerCase().includes(productSearch.toLowerCase().trim())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header & Tab Navigation */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tabsRow}>
          {(['settings', 'milestones', 'history'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                { backgroundColor: activeTab === tab ? '#10b981' : colors.cardAlt },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab ? '#ffffff' : colors.textMuted },
                ]}
              >
                {tab === 'settings' ? 'Config' : tab === 'milestones' ? 'Milestones' : 'History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/(tabs)/more/scanner')}
        >
          <Ionicons name="qr-code-outline" size={17} color="#fff" />
          <Text style={styles.scanBtnText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchData();
              }}
              tintColor="#10b981"
            />
          }
        >
          {/* TAB 1: SETTINGS / CONFIGURATION */}
          {activeTab === 'settings' && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Program Status */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Program Status</Text>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    Enable or disable the referral program entirely.
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings?.is_active)}
                  onValueChange={(v) => setSettings({ ...settings, is_active: v })}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Referrer Reward Type */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Referrer Reward Type</Text>
              <View style={styles.radioRow}>
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    {
                      borderColor: rewardType === 'money' ? '#10b981' : colors.border,
                      backgroundColor: rewardType === 'money' ? (isDark ? '#064e3b' : '#ecfdf5') : colors.cardAlt,
                    },
                  ]}
                  onPress={() => {
                    setRewardType('money');
                    setSettings({ ...settings, referrer_reward_product: null });
                  }}
                >
                  <Ionicons
                    name={rewardType === 'money' ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={rewardType === 'money' ? '#10b981' : colors.textMuted}
                  />
                  <Text style={[styles.radioText, { color: colors.text }]}>Cash Wallet Reward</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    {
                      borderColor: rewardType === 'product' ? '#10b981' : colors.border,
                      backgroundColor: rewardType === 'product' ? (isDark ? '#064e3b' : '#ecfdf5') : colors.cardAlt,
                    },
                  ]}
                  onPress={() => {
                    setRewardType('product');
                    setSettings({ ...settings, referrer_reward: '0.00' });
                  }}
                >
                  <Ionicons
                    name={rewardType === 'product' ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={rewardType === 'product' ? '#10b981' : colors.textMuted}
                  />
                  <Text style={[styles.radioText, { color: colors.text }]}>Free Product Reward</Text>
                </TouchableOpacity>
              </View>

              {rewardType === 'money' ? (
                <View style={[styles.subBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                    Referrer Cash Reward (₹)
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings?.referrer_reward ?? '0')}
                    onChangeText={(v) => setSettings({ ...settings, referrer_reward: v })}
                    placeholder="50.00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.hintText, { color: colors.textMuted }]}>
                    Amount credited to the referrer&apos;s wallet after their invited friend completes their first order.
                  </Text>
                </View>
              ) : (
                <View style={[styles.subBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                    Select Free Reward Product
                  </Text>
                  <TouchableOpacity
                    style={[styles.selectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setProductPickerVisible(true)}
                  >
                    <Text style={[styles.selectBtnText, { color: colors.text }]} numberOfLines={1}>
                      {selectedProductName}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                  <Text style={[styles.hintText, { color: colors.textMuted }]}>
                    A free gift order for this product will be automatically created for the referrer.
                  </Text>
                </View>
              )}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Minimum Spend Requirement */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.label, { color: colors.text }]}>Minimum Spend Requirement</Text>
                  <Text style={[styles.subText, { color: colors.textMuted }]}>
                    Require the referrer to spend a minimum threshold before they can unlock referral rewards.
                  </Text>
                </View>
                <Switch
                  value={Boolean(settings?.require_min_spend)}
                  onValueChange={(v) => setSettings({ ...settings, require_min_spend: v })}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              {settings?.require_min_spend ? (
                <View style={[styles.subBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                    Minimum Spend Amount (₹)
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    keyboardType="numeric"
                    value={String(settings?.min_spend_amount ?? '0')}
                    onChangeText={(v) => setSettings({ ...settings, min_spend_amount: v })}
                    placeholder="200.00"
                    placeholderTextColor={colors.textMuted}
                  />

                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 8 }]}>
                    Spend Time Window
                  </Text>
                  <View style={styles.periodRow}>
                    {[
                      { key: 'WEEK', label: 'Past 7 Days' },
                      { key: 'MONTH', label: 'Past 30 Days' },
                      { key: 'YEAR', label: 'Past 365 Days' },
                    ].map((p) => (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          styles.periodBtn,
                          {
                            borderColor: settings.min_spend_period === p.key ? '#10b981' : colors.border,
                            backgroundColor:
                              settings.min_spend_period === p.key
                                ? (isDark ? '#064e3b' : '#ecfdf5')
                                : colors.card,
                          },
                        ]}
                        onPress={() => setSettings({ ...settings, min_spend_period: p.key })}
                      >
                        <Text
                          style={[
                            styles.periodBtnText,
                            {
                              color:
                                settings.min_spend_period === p.key
                                  ? (isDark ? '#a7f3d0' : '#047857')
                                  : colors.textMuted,
                              fontWeight: settings.min_spend_period === p.key ? '700' : '500',
                            },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* WhatsApp Share Message Template */}
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                WhatsApp Share Message Template
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                ]}
                multiline
                numberOfLines={3}
                value={settings?.share_text_template || ''}
                onChangeText={(v) => setSettings({ ...settings, share_text_template: v })}
                placeholder="Join Narendra Kirana with code {code} and get special discounts! {link}"
                placeholderTextColor={colors.textMuted}
              />
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Use {'{code}'} and {'{link}'} as dynamic placeholders that are replaced when customers share on WhatsApp.
              </Text>

              <TouchableOpacity
                style={[styles.saveBtn, { opacity: saving ? 0.7 : 1 }]}
                onPress={handleSaveSettings}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Referral Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: BONUS MILESTONES */}
          {activeTab === 'milestones' && (
            <View>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Add New Milestone</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Required Friends</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={newReqCount}
                      onChangeText={setNewReqCount}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Bonus Reward (₹)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                      placeholder="e.g. 150"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={newBonusAmount}
                      onChangeText={setNewBonusAmount}
                    />
                  </View>
                </View>
                <TouchableOpacity style={styles.addMilestoneBtn} onPress={handleAddMilestone}>
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addMilestoneBtnText}>Add Milestone</Text>
                </TouchableOpacity>
              </View>

              {milestones.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No bonus milestones configured yet.
                </Text>
              ) : (
                milestones.map((m, idx) => (
                  <View
                    key={m?.id ?? `mil-${idx}`}
                    style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>
                        {m?.required_referrals} Successful Referrals
                      </Text>
                      <Text style={[styles.bonusTag, { color: '#10b981' }]}>
                        Bonus: ₹{m?.bonus_reward}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteMilestone(m.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* TAB 3: REFERRAL HISTORY & MONITOR */}
          {activeTab === 'history' && (
            <View>
              {history.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No customer referrals recorded yet.
                </Text>
              ) : (
                history.map((item, idx) => (
                  <View
                    key={item?.id ?? `ref-${idx}`}
                    style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>
                        Referrer: {item?.referrer_name || item?.referrer_username || 'Customer'}
                      </Text>
                      <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                        Referred Friend: {item?.referred_name || item?.referred_username || 'Friend'}
                      </Text>
                      <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                        {item?.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                      </Text>
                      <View style={styles.statusBadge}>
                        <Text
                          style={[
                            styles.itemStatus,
                            {
                              color:
                                item?.status === 'COMPLETED'
                                  ? '#10b981'
                                  : item?.status === 'AWAITING_APPROVAL'
                                  ? '#f59e0b'
                                  : '#64748b',
                            },
                          ]}
                        >
                          Status: {item?.status || 'PENDING'}
                        </Text>
                      </View>
                    </View>
                    {item?.status === 'AWAITING_APPROVAL' || item?.status === 'PENDING' ? (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(item.id)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Free Product Reward Picker Modal */}
      <Modal visible={productPickerVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Free Reward Product</Text>
              <TouchableOpacity onPress={() => setProductPickerVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalSearch,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Search product name..."
              placeholderTextColor={colors.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
            />

            <ScrollView style={{ maxHeight: 350 }}>
              {filteredProducts.map((p) => {
                const isSelected = settings.referrer_reward_product === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.productOption,
                      {
                        borderColor: isSelected ? '#10b981' : colors.border,
                        backgroundColor: isSelected ? (isDark ? '#064e3b' : '#ecfdf5') : colors.cardAlt,
                      },
                    ]}
                    onPress={() => {
                      setSettings({
                        ...settings,
                        referrer_reward_product: p.id,
                        referrer_reward_product_name: p.name,
                      });
                      setProductPickerVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.prodName, { color: colors.text }]}>{p.name}</Text>
                      <Text style={[styles.prodPrice, { color: '#10b981' }]}>
                        Regular Price: ₹{p.regular_price || p.price}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#10b981" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    marginBottom: 6,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  radioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 10,
  },
  radioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  periodBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodBtnText: {
    fontSize: 11,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  addMilestoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingVertical: 11,
    borderRadius: 8,
    marginTop: 6,
  },
  addMilestoneBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  listCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 4,
  },
  itemStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  bonusTag: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 6,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSearch: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '600',
  },
  prodPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
});
