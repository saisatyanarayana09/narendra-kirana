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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getErrorMessage } from '../../../services/api';
import { showAlert, showConfirm } from '../../../utils/alerts';

type TabKey = 'all' | 'active' | 'inactive' | 'locked' | 'delete_requested';

export default function CustomersScreen() {
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
        ? 'Permanently anonymize/delete this customer account?'
        : 'Keep this customer account active?',
      async () => {
        try {
          await api.post(endpoint);
          fetchCustomers();
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
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, phone, email, username..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabPill, activeTab === t.key && styles.tabPillActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={[styles.tabPillText, activeTab === t.key && styles.tabPillTextActive]}>
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
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{fullName || item?.username || 'Customer'}</Text>
                    <Text style={styles.subText}>
                      @{item?.username} • {phone}
                    </Text>
                    {item?.email ? <Text style={styles.subText}>{item.email}</Text> : null}
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
                    style={styles.actionBtn}
                    onPress={() => setNotifyTarget(item)}
                  >
                    <Ionicons name="notifications-outline" size={15} color="#3b82f6" />
                    <Text style={[styles.actionText, { color: '#3b82f6' }]}>Notify</Text>
                  </TouchableOpacity>

                  {!item?.is_active ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleActivate(item.id, item.username)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#10b981" />
                      <Text style={[styles.actionText, { color: '#10b981' }]}>Activate</Text>
                    </TouchableOpacity>
                  ) : null}

                  {item?.is_locked ? (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleUnlock(item.id, item.username)}
                    >
                      <Ionicons name="lock-open-outline" size={15} color="#10b981" />
                      <Text style={[styles.actionText, { color: '#10b981' }]}>Unlock</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleLock(item.id, item.username)}
                    >
                      <Ionicons name="lock-closed-outline" size={15} color="#f59e0b" />
                      <Text style={[styles.actionText, { color: '#f59e0b' }]}>Lock</Text>
                    </TouchableOpacity>
                  )}

                  {delReq ? (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDeleteRequest(item.id, true)}
                      >
                        <Text style={[styles.actionText, { color: '#ef4444' }]}>Approve Del</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDeleteRequest(item.id, false)}
                      >
                        <Text style={[styles.actionText, { color: '#94a3b8' }]}>Reject Del</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No customers match this filter.</Text>}
        />
      )}

      <Modal visible={Boolean(notifyTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Message {notifyTarget?.first_name || notifyTarget?.username}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Notification Title"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Message..."
              placeholderTextColor="#64748b"
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setNotifyTarget(null)}
              >
                <Text style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Cancel</Text>
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
    backgroundColor: '#0f172a',
  },
  headerBox: {
    backgroundColor: '#1e293b',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabsRow: {
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#334155',
  },
  tabPillActive: {
    backgroundColor: '#10b981',
  },
  tabPillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  name: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subText: {
    color: '#94a3b8',
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
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#f8fafc',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  sendModalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
});
