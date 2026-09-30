import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

type TabKey = 'all' | 'active' | 'inactive' | 'locked' | 'delete_requested';

export default function CustomersScreen() {
  const { colors, isDark } = useAppTheme();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  // Direct Notification Modal
  const [notifyTarget, setNotifyTarget] = useState<any | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Customer Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await api.get('/auth/customers/');
      const data = response?.data;
      const list = data?.customers ?? data?.results ?? (Array.isArray(data) ? data : []);
      setCustomers(Array.isArray(list) ? list : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(e, 'Failed to fetch customers.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleOpenDetails = async (cust: any) => {
    setSelectedCustomer(cust);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/auth/customers/${cust.id}/details/`);
      setCustomerDetails(res.data);
    } catch {
      setCustomerDetails(cust);
    } finally {
      setDetailsLoading(false);
    }
  };

  const displayedCustomers = useMemo(() => {
    const safeList = Array.isArray(customers) ? customers : [];
    const q = searchQuery.trim().toLowerCase();

    return safeList.filter((c) => {
      if (!c) return false;
      if (activeTab === 'active' && (!c.is_active || c.is_locked)) return false;
      if (activeTab === 'inactive' && c.is_active) return false;
      if (activeTab === 'locked' && !c.is_locked) return false;
      if (activeTab === 'delete_requested' && !c.customer_profile?.delete_requested) return false;

      if (q) {
        const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        const username = String(c.username || '').toLowerCase();
        const email = String(c.email || '').toLowerCase();
        const phone = String(c.customer_profile?.mobile_number || '').toLowerCase();
        const idStr = String(c.id || '');
        return (
          fullName.includes(q) ||
          username.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          idStr.includes(q)
        );
      }
      return true;
    });
  }, [customers, activeTab, searchQuery]);

  const handleUnlock = (userId: number, username: string) => {
    showConfirm('Unlock Account', `Unlock customer "${username}"?`, async () => {
      try {
        await api.post(`/auth/customers/${userId}/unlock/`);
        fetchCustomers();
        showAlert('Success', `Unlocked "${username}".`);
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to unlock customer.'));
      }
    });
  };

  const handleLock = (userId: number, username: string) => {
    showConfirm('Lock Account', `Temporarily lock customer "${username}"?`, async () => {
      try {
        await api.post(`/auth/customers/${userId}/lock/`, {
          reason: 'Locked by store administrator',
        });
        fetchCustomers();
        showAlert('Success', `Locked "${username}".`);
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to lock customer.'));
      }
    });
  };

  const handleActivate = (userId: number, username: string) => {
    showConfirm('Activate Account', `Activate account "${username}"?`, async () => {
      try {
        await api.post(`/auth/customers/${userId}/activate/`);
        fetchCustomers();
        showAlert('Success', `Activated "${username}".`);
      } catch (e: any) {
        showAlert('Error', getErrorMessage(e, 'Failed to activate customer.'));
      }
    });
  };

  const handleDeleteRequest = (userId: number, approve: boolean) => {
    const endpoint = approve
      ? `/auth/customers/${userId}/approve-delete/`
      : `/auth/customers/${userId}/reject-delete/`;
    showConfirm(
      approve ? 'Approve Account Deletion' : 'Reject Deletion Request',
      approve
        ? 'Permanently delete this customer account?'
        : 'Keep this customer account active?',
      async () => {
        try {
          await api.post(endpoint);
          fetchCustomers();
          showAlert('Success', approve ? 'Customer deleted.' : 'Deletion rejected.');
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Action failed.'));
        }
      }
    );
  };

  const handleSendDirectNotification = async () => {
    if (!notifyTarget || !notifTitle.trim() || !notifMessage.trim()) {
      showAlert('Validation', 'Please enter a title and message.');
      return;
    }
    setSendingNotif(true);
    try {
      await api.post('/notifications/owner/send/', {
        user: notifyTarget.id,
        title: notifTitle.trim(),
        message: notifMessage.trim(),
      });
      setNotifyTarget(null);
      setNotifTitle('');
      setNotifMessage('');
      showAlert('Sent', 'Notification sent to customer!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to send notification.'));
    } finally {
      setSendingNotif(false);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'locked', label: 'Locked' },
    { key: 'delete_requested', label: 'Deletion Req' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.headerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search name, phone, email, username..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabPill,
                { backgroundColor: colors.cardAlt },
                activeTab === t.key && styles.tabPillActive,
              ]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text
                style={[
                  styles.tabPillText,
                  { color: colors.textMuted },
                  activeTab === t.key && styles.tabPillTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayedCustomers}
          keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `cust-${idx}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchCustomers();
              }}
              tintColor="#10b981"
            />
          }
          renderItem={({ item }) => {
            const fullName = `${item?.first_name || ''} ${item?.last_name || ''}`.trim();
            const phone = item?.customer_profile?.mobile_number || 'No phone';
            const delReq = Boolean(item?.customer_profile?.delete_requested);

            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => handleOpenDetails(item)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]}>
                      {fullName || item?.username || 'Customer'}
                    </Text>
                    <Text style={[styles.subText, { color: colors.textMuted }]}>
                      @{item?.username} • {phone}
                    </Text>
                    {item?.email ? (
                      <Text style={[styles.subText, { color: colors.textMuted }]}>{item.email}</Text>
                    ) : null}
                  </View>
                  <View style={styles.badgesCol}>
                    {item?.is_locked ? (
                      <View style={[styles.badge, { backgroundColor: '#dc2626' }]}>
                        <Text style={styles.badgeText}>LOCKED</Text>
                      </View>
                    ) : !item?.is_active ? (
                      <View style={[styles.badge, { backgroundColor: '#d97706' }]}>
                        <Text style={styles.badgeText}>INACTIVE</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: '#059669' }]}>
                        <Text style={styles.badgeText}>ACTIVE</Text>
                      </View>
                    )}
                    {delReq ? (
                      <View style={[styles.badge, { backgroundColor: '#e11d48', marginTop: 4 }]}>
                        <Text style={styles.badgeText}>DELETE REQ</Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                    onPress={() => setNotifyTarget(item)}
                  >
                    <Ionicons name="notifications-outline" size={15} color="#3b82f6" />
                    <Text style={[styles.actionText, { color: '#3b82f6' }]}>Notify</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                    onPress={() => handleOpenDetails(item)}
                  >
                    <Ionicons name="eye-outline" size={15} color="#10b981" />
                    <Text style={[styles.actionText, { color: '#10b981' }]}>Profile</Text>
                  </TouchableOpacity>

                  {!item?.is_active ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                      onPress={() => handleActivate(item.id, item.username)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" />
                      <Text style={[styles.actionText, { color: '#10b981' }]}>Activate</Text>
                    </TouchableOpacity>
                  ) : null}

                  {item?.is_locked ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                      onPress={() => handleUnlock(item.id, item.username)}
                    >
                      <Ionicons name="lock-open-outline" size={15} color="#10b981" />
                      <Text style={[styles.actionText, { color: '#10b981' }]}>Unlock</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                      onPress={() => handleLock(item.id, item.username)}
                    >
                      <Ionicons name="lock-closed-outline" size={15} color="#f59e0b" />
                      <Text style={[styles.actionText, { color: '#f59e0b' }]}>Lock</Text>
                    </TouchableOpacity>
                  )}

                  {delReq ? (
                    <>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                        onPress={() => handleDeleteRequest(item.id, true)}
                      >
                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Approve Del</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                        onPress={() => handleDeleteRequest(item.id, false)}
                      >
                        <Text style={[styles.actionText, { color: colors.textMuted }]}>Reject Del</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No customers match this filter.
            </Text>
          }
        />
      )}

      {/* Customer Detail Profile Modal */}
      <Modal visible={Boolean(selectedCustomer)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileHeader}>
              <View>
                <Text style={[styles.profileTitle, { color: colors.text }]}>
                  {selectedCustomer?.first_name || selectedCustomer?.username || 'Customer Profile'}
                </Text>
                <Text style={[styles.profileSub, { color: colors.textMuted }]}>
                  ID: #{selectedCustomer?.id} • @{selectedCustomer?.username}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCustomer(null)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {/* Metrics Grid */}
                <View style={styles.profileMetrics}>
                  <View style={[styles.profileMetricBox, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>LIFETIME SALES</Text>
                    <Text style={[styles.profileMetricVal, { color: '#10b981' }]}>
                      ₹{customerDetails?.total_spent ?? '0.00'}
                    </Text>
                  </View>
                  <View style={[styles.profileMetricBox, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>TOTAL ORDERS</Text>
                    <Text style={[styles.profileMetricVal, { color: '#3b82f6' }]}>
                      {customerDetails?.total_orders ?? 0}
                    </Text>
                  </View>
                  <View style={[styles.profileMetricBox, { backgroundColor: colors.cardAlt }]}>
                    <Text style={[styles.profileMetricLabel, { color: colors.textMuted }]}>WALLET CASH</Text>
                    <Text style={[styles.profileMetricVal, { color: '#f59e0b' }]}>
                      ₹{customerDetails?.wallet_balance ?? '0.00'}
                    </Text>
                  </View>
                </View>

                {/* Contact Shortcuts */}
                {selectedCustomer?.customer_profile?.mobile_number ? (
                  <View style={styles.profileActions}>
                    <TouchableOpacity
                      style={[styles.contactBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={() =>
                        Linking.openURL(`tel:${selectedCustomer.customer_profile.mobile_number}`)
                      }
                    >
                      <Ionicons name="call" size={16} color="#fff" />
                      <Text style={styles.contactBtnText}>Call Customer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.contactBtn, { backgroundColor: '#10b981' }]}
                      onPress={() => {
                        const cleanDigits = String(
                          selectedCustomer.customer_profile.mobile_number
                        ).replace(/\D/g, '');
                        const num = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
                        Linking.openURL(`https://wa.me/${num}`);
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                      <Text style={styles.contactBtnText}>WhatsApp</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Saved Delivery Addresses */}
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                  Saved Delivery Addresses
                </Text>
                {Array.isArray(customerDetails?.addresses) && customerDetails.addresses.length > 0 ? (
                  customerDetails.addresses.map((addr: any, idx: number) => (
                    <View key={idx} style={[styles.addressBox, { backgroundColor: colors.cardAlt }]}>
                      <Text style={[styles.addressText, { color: colors.text }]}>
                        {addr.address_line || addr.address || 'Address'}
                      </Text>
                      {addr.pincode ? (
                        <Text style={[styles.addressPin, { color: colors.textMuted }]}>
                          Pincode: {addr.pincode}
                        </Text>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noAddressText, { color: colors.textMuted }]}>
                    No saved addresses recorded.
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Direct Push Notification Modal */}
      <Modal visible={Boolean(notifyTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Message {notifyTarget?.first_name || notifyTarget?.username}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Notification Title"
              placeholderTextColor={colors.textMuted}
              value={notifTitle}
              onChangeText={setNotifTitle}
            />
            <TextInput
              style={[
                styles.modalInput,
                {
                  height: 80,
                  textAlignVertical: 'top',
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setNotifyTarget(null)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendModalBtn}
                onPress={handleSendDirectNotification}
                disabled={sendingNotif}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {sendingNotif ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
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
  headerBox: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tabPillActive: {
    backgroundColor: '#10b981',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
  },
  subText: {
    fontSize: 12,
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-end',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileSub: {
    fontSize: 12,
    marginTop: 2,
  },
  profileMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  profileMetricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileMetricLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileMetricVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  contactBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  addressBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 13,
  },
  addressPin: {
    fontSize: 11,
    marginTop: 2,
  },
  noAddressText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  cancelModalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendModalBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
