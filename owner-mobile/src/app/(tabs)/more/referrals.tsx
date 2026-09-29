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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { showAlert } from '../../../utils/alerts';

export default function ReferralsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'milestones'>('settings');
  const [settings, setSettings] = useState<any>({
    is_active: true,
    referrer_reward: '50.00',
    require_min_spend: false,
    min_spend_amount: '0.00',
  });
  const [milestones, setMilestones] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newReqCount, setNewReqCount] = useState('');
  const [newBonusAmount, setNewBonusAmount] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [setRes, milRes, histRes] = await Promise.allSettled([
        api.get('/offers/referral-settings/'),
        api.get('/offers/referral-milestones/'),
        api.get('/offers/referrals/'),
      ]);

      if (setRes.status === 'fulfilled' && setRes.value?.data) {
        setSettings(setRes.value.data);
      }
      if (milRes.status === 'fulfilled' && milRes.value?.data) {
        const rawMil = milRes.value.data?.results ?? milRes.value.data;
        setMilestones(Array.isArray(rawMil) ? rawMil : []);
      }
      if (histRes.status === 'fulfilled' && histRes.value?.data) {
        const rawHist = histRes.value.data?.results ?? histRes.value.data;
        setHistory(Array.isArray(rawHist) ? rawHist : []);
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
      await api.patch('/offers/referral-settings/', {
        ...settings,
        referee_reward: 0,
      });
      showAlert('Success', 'Referral settings saved!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to save referral settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilestone = async () => {
    if (!newReqCount.trim() || !newBonusAmount.trim()) {
      showAlert('Validation', 'Enter both required referrals and bonus reward.');
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
    try {
      await api.delete(`/offers/referral-milestones/${id}/`);
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to delete milestone.'));
    }
  };

  const handleApprove = async (referralId: number) => {
    try {
      await api.post(`/offers/referrals/${referralId}/approve/`, { token: '' });
      showAlert('Success', 'Referral reward approved!');
      fetchData();
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to approve referral. Scan customer QR code if required.'));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.tabsRow}>
          {(['settings', 'history', 'milestones'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={() => router.push('/(tabs)/more/scanner')}
        >
          <Ionicons name="qr-code-outline" size={18} color="#fff" />
          <Text style={styles.scanBtnText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
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
          {activeTab === 'settings' && (
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Enable Referral Program</Text>
                <Switch
                  value={Boolean(settings?.is_active)}
                  onValueChange={(v) => setSettings({ ...settings, is_active: v })}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              <Text style={styles.inputLabel}>Referrer Cash Reward (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(settings?.referrer_reward ?? '0')}
                onChangeText={(v) => setSettings({ ...settings, referrer_reward: v })}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Require Minimum Spend</Text>
                <Switch
                  value={Boolean(settings?.require_min_spend)}
                  onValueChange={(v) => setSettings({ ...settings, require_min_spend: v })}
                  trackColor={{ false: '#334155', true: '#10b981' }}
                />
              </View>

              {settings?.require_min_spend ? (
                <>
                  <Text style={styles.inputLabel}>Minimum Spend Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(settings?.min_spend_amount ?? '0')}
                    onChangeText={(v) => setSettings({ ...settings, min_spend_amount: v })}
                  />
                </>
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Referral Settings</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'history' && (
            <View>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No referrals recorded yet.</Text>
              ) : (
                history.map((item, idx) => (
                  <View key={item?.id ?? `ref-${idx}`} style={styles.listCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>
                        Referrer: {item?.referrer_name || item?.referrer_username || 'Customer'}
                      </Text>
                      <Text style={styles.itemSub}>
                        Referred: {item?.referred_name || item?.referred_username || 'Friend'}
                      </Text>
                      <Text style={styles.itemStatus}>Status: {item?.status || 'PENDING'}</Text>
                    </View>
                    {item?.status === 'PENDING' ? (
                      <TouchableOpacity
                        style={styles.approveBtn}
                        onPress={() => handleApprove(item.id)}
                      >
                        <Text style={styles.approveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'milestones' && (
            <View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Add Bonus Milestone</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Referrals Count"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={newReqCount}
                    onChangeText={setNewReqCount}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Bonus ₹"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={newBonusAmount}
                    onChangeText={setNewBonusAmount}
                  />
                </View>
                <TouchableOpacity style={[styles.saveBtn, { marginTop: 12 }]} onPress={handleAddMilestone}>
                  <Text style={styles.saveBtnText}>Add Milestone</Text>
                </TouchableOpacity>
              </View>

              {milestones.map((m, idx) => (
                <View key={m?.id ?? `mil-${idx}`} style={styles.listCard}>
                  <View>
                    <Text style={styles.itemTitle}>{m?.required_referrals} Referrals</Text>
                    <Text style={styles.itemSub}>Bonus Reward: ₹{m?.bonus_reward}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteMilestone(m.id)}>
                    <Ionicons name="trash" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  topBar: {
    backgroundColor: '#1e293b',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  tabBtnActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fff',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '500',
  },
  inputLabel: {
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  saveBtn: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  itemStatus: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 32,
  },
});
