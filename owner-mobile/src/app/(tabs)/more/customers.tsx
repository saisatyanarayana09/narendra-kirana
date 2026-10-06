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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import api, { cachedGet, getErrorMessage } from '../../../services/api';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';
import ScreenHeader from '../../../components/ScreenHeader';

type TabKey = 'all' | 'active' | 'inactive' | 'locked' | 'delete_requested';

interface CustomerCounts {
  total: number;
  active: number;
  inactive: number;
  locked: number;
  delete_requested: number;
}

const customerKeyExtractor = (item: any, idx: number) =>
  item?.id != null ? String(item.id) : `cust-${idx}`;

interface CustomerCardProps {
  item: any;
  isBusy: boolean;
  colors: any;
  isDark: boolean;
  onOpenDetails: (cust: any) => void;
  onNotify: (cust: any) => void;
  onActivate: (userId: number, username: string) => void;
  onUnlock: (userId: number, username: string) => void;
  onPromptLock: (cust: any) => void;
  onDeleteRequest: (userId: number, approve: boolean) => void;
}

const CustomerCard = React.memo<CustomerCardProps>(
  ({
    item,
    isBusy,
    colors,
    isDark,
    onOpenDetails,
    onNotify,
    onActivate,
    onUnlock,
    onPromptLock,
    onDeleteRequest,
  }) => {
    const fullName = `${item?.first_name || ''} ${item?.last_name || ''}`.trim();
    const phone = item?.customer_profile?.mobile_number
      ? `+91 ${item.customer_profile.mobile_number}`
      : 'No phone';
    const delReq = Boolean(item?.customer_profile?.delete_requested);
    const initial = (item?.first_name || item?.username || 'C')[0].toUpperCase();

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.8}
        onPress={() => onOpenDetails(item)}
      >
        <View style={styles.cardTop}>
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: isDark ? '#312e81' : '#e0e7ff',
                borderColor: isDark ? '#4338ca' : '#c7d2fe',
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: isDark ? '#c7d2fe' : '#4338ca' }]}>
              {initial}
            </Text>
          </View>

          {/* Main Information */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.name, { color: colors.text }]}>
              {fullName || item?.username || 'Customer'}
            </Text>
            <Text style={[styles.subText, { color: colors.textMuted }]}>
              @{item?.username} • {phone}
            </Text>
            <Text style={[styles.subText, { color: colors.textMuted, marginTop: 1 }]}>
              ID: #{item?.id} {item?.email ? `• ${item.email}` : ''}
            </Text>
          </View>

          {/* Status Badges */}
          <View style={styles.badgesCol}>
            {item?.is_locked ? (
              <View style={[styles.badge, { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }]}>
                <Ionicons name="lock-closed" size={10} color="#dc2626" />
                <Text style={[styles.badgeText, { color: '#dc2626' }]}>
                  Locked ({item?.failed_login_attempts || 0})
                </Text>
              </View>
            ) : delReq ? (
              <View style={[styles.badge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                <Ionicons name="warning" size={10} color="#b45309" />
                <Text style={[styles.badgeText, { color: '#b45309' }]}>Delete Req</Text>
              </View>
            ) : item?.is_active ? (
              <View style={[styles.badge, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0' }]}>
                <View style={[styles.badgeDot, { backgroundColor: '#059669' }]} />
                <Text style={[styles.badgeText, { color: '#059669' }]}>Active</Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                <View style={[styles.badgeDot, { backgroundColor: '#64748b' }]} />
                <Text style={[styles.badgeText, { color: '#64748b' }]}>Inactive</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Details Button */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
            onPress={() => onOpenDetails(item)}
          >
            <Ionicons name="eye-outline" size={14} color="#6366f1" />
            <Text style={[styles.actionText, { color: '#6366f1' }]}>Details</Text>
          </TouchableOpacity>

          {/* Notify Button (active customers) */}
          {item?.is_active && !item?.is_locked && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
              onPress={() => onNotify(item)}
            >
              <Ionicons name="notifications-outline" size={14} color="#3b82f6" />
              <Text style={[styles.actionText, { color: '#3b82f6' }]}>Notify</Text>
            </TouchableOpacity>
          )}

          {/* Activate Button (inactive customers) */}
          {!item?.is_active && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#d1fae5' }]}
              onPress={() => onActivate(item.id, item.username)}
              disabled={isBusy}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
              <Text style={[styles.actionText, { color: '#059669' }]}>Activate</Text>
            </TouchableOpacity>
          )}

          {/* Lock / Unlock Toggle */}
          {item?.is_locked ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#d1fae5' }]}
              onPress={() => onUnlock(item.id, item.username)}
              disabled={isBusy}
            >
              <Ionicons name="lock-open-outline" size={14} color="#059669" />
              <Text style={[styles.actionText, { color: '#059669' }]}>Unlock</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
              onPress={() => onPromptLock(item)}
              disabled={isBusy}
            >
              <Ionicons name="lock-closed-outline" size={14} color="#ef4444" />
              <Text style={[styles.actionText, { color: '#ef4444' }]}>Lock</Text>
            </TouchableOpacity>
          )}

          {/* Deletion Request Actions */}
          {delReq && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#fee2e2' }]}
                onPress={() => onDeleteRequest(item.id, true)}
                disabled={isBusy}
              >
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
                <Text style={[styles.actionText, { color: '#dc2626' }]}>Approve Del</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.cardAlt }]}
                onPress={() => onDeleteRequest(item.id, false)}
                disabled={isBusy}
              >
                <Ionicons name="close-circle-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.actionText, { color: colors.textMuted }]}>Reject Del</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.item?.id === next.item?.id &&
      prev.item?.username === next.item?.username &&
      prev.item?.first_name === next.item?.first_name &&
      prev.item?.last_name === next.item?.last_name &&
      prev.item?.email === next.item?.email &&
      prev.item?.is_active === next.item?.is_active &&
      prev.item?.is_locked === next.item?.is_locked &&
      prev.item?.failed_login_attempts === next.item?.failed_login_attempts &&
      prev.item?.customer_profile?.mobile_number === next.item?.customer_profile?.mobile_number &&
      prev.item?.customer_profile?.delete_requested === next.item?.customer_profile?.delete_requested &&
      prev.isBusy === next.isBusy &&
      prev.isDark === next.isDark
    );
  }
);
CustomerCard.displayName = 'CustomerCard';

export default function CustomersScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();

  const [customers, setCustomers] = useState<any[]>([]);
  const [counts, setCounts] = useState<CustomerCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Direct Notification Modal
  const [notifyTarget, setNotifyTarget] = useState<any | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Lock Reason Modal
  const [lockTarget, setLockTarget] = useState<any | null>(null);
  const [lockReason, setLockReason] = useState('Locked by store administrator');
  const [lockingAccount, setLockingAccount] = useState(false);

  // Customer Detail Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchCustomers = useCallback(async (forceRefresh = false) => {
    try {
      const response = await cachedGet('/auth/customers/', {
        forceRefresh,
        onUpdate: () => {
          void fetchCustomers();
        },
      });
      const data = response?.data;
      const list = data?.customers ?? data?.results ?? (Array.isArray(data) ? data : []);
      setCustomers(Array.isArray(list) ? list : []);
      if (data?.counts) {
        setCounts(data.counts);
      }
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

  const fetchCustomerDetails = useCallback(async (id: number) => {
    setDetailsLoading(true);
    try {
      const res = await api.get(`/auth/customers/${id}/details/`);
      setCustomerDetails(res.data);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to load customer details.'));
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const handleOpenDetails = useCallback((cust: any) => {
    setSelectedCustomer(cust);
    setCustomerDetails(cust);
    fetchCustomerDetails(cust.id);
  }, [fetchCustomerDetails]);

  const handleNotifyTarget = useCallback((cust: any) => {
    setNotifyTarget(cust);
  }, []);

  // KPI Counts (derived or backend)
  const totalCount = counts?.total ?? customers.length;
  const activeCount = counts?.active ?? customers.filter((c) => c.is_active && !c.is_locked).length;
  const inactiveCount = counts?.inactive ?? customers.filter((c) => !c.is_active).length;
  const lockedCount = counts?.locked ?? customers.filter((c) => c.is_locked).length;
  const deleteRequestedCount =
    counts?.delete_requested ??
    customers.filter((c) => Boolean(c.customer_profile?.delete_requested)).length;

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

  const handleUnlock = useCallback((userId: number, username: string) => {
    showConfirm(
      'Unlock Account',
      `Are you sure you want to unlock "${username}"? This resets failed attempts and immediately re-enables login.`,
      async () => {
        setActionInProgress(userId);
        try {
          await api.post(`/auth/customers/${userId}/unlock/`);
          await fetchCustomers();
          if (selectedCustomer?.id === userId) {
            await fetchCustomerDetails(userId);
          }
          showAlert('Success', `Account "${username}" has been unlocked.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to unlock customer.'));
        } finally {
          setActionInProgress(null);
        }
      }
    );
  }, [fetchCustomers, selectedCustomer?.id, fetchCustomerDetails]);

  const handlePromptLock = useCallback((cust: any) => {
    setLockTarget(cust);
    setLockReason('Locked by store administrator');
  }, []);

  const handleConfirmLock = async () => {
    if (!lockTarget) return;
    setLockingAccount(true);
    setActionInProgress(lockTarget.id);
    try {
      await api.post(`/auth/customers/${lockTarget.id}/lock/`, {
        reason: lockReason.trim() || 'Locked by store administrator',
      });
      await fetchCustomers();
      if (selectedCustomer?.id === lockTarget.id) {
        await fetchCustomerDetails(lockTarget.id);
      }
      showAlert('Success', `Account "${lockTarget.username}" has been locked.`);
      setLockTarget(null);
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to lock customer.'));
    } finally {
      setLockingAccount(false);
      setActionInProgress(null);
    }
  };

  const handleActivate = useCallback((userId: number, username: string) => {
    showConfirm(
      'Activate Account',
      `Activate account "${username}"? Customer will be able to log in and shop immediately.`,
      async () => {
        setActionInProgress(userId);
        try {
          await api.post(`/auth/customers/${userId}/activate/`);
          await fetchCustomers();
          if (selectedCustomer?.id === userId) {
            await fetchCustomerDetails(userId);
          }
          showAlert('Success', `Account "${username}" has been activated.`);
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Failed to activate customer.'));
        } finally {
          setActionInProgress(null);
        }
      }
    );
  }, [fetchCustomers, selectedCustomer?.id, fetchCustomerDetails]);

  const handleDeleteRequest = useCallback((userId: number, approve: boolean) => {
    const endpoint = approve
      ? `/auth/customers/${userId}/approve-delete/`
      : `/auth/customers/${userId}/reject-delete/`;
    showConfirm(
      approve ? 'Approve Permanent Deletion' : 'Reject Deletion Request',
      approve
        ? 'Permanently delete this customer and all their personal data? This cannot be undone.'
        : 'Reject this deletion request and keep the account active?',
      async () => {
        setActionInProgress(userId);
        try {
          await api.post(endpoint);
          await fetchCustomers();
          if (selectedCustomer?.id === userId) {
            setSelectedCustomer(null);
          }
          showAlert('Success', approve ? 'Customer deleted permanently.' : 'Deletion rejected.');
        } catch (e: any) {
          showAlert('Error', getErrorMessage(e, 'Action failed.'));
        } finally {
          setActionInProgress(null);
        }
      }
    );
  }, [fetchCustomers, selectedCustomer?.id]);

  const renderCustomerItem = useCallback(
    ({ item }: { item: any }) => (
      <CustomerCard
        item={item}
        isBusy={actionInProgress === item?.id}
        colors={colors}
        isDark={isDark}
        onOpenDetails={handleOpenDetails}
        onNotify={handleNotifyTarget}
        onActivate={handleActivate}
        onUnlock={handleUnlock}
        onPromptLock={handlePromptLock}
        onDeleteRequest={handleDeleteRequest}
      />
    ),
    [
      actionInProgress,
      colors,
      isDark,
      handleOpenDetails,
      handleNotifyTarget,
      handleActivate,
      handleUnlock,
      handlePromptLock,
      handleDeleteRequest,
    ]
  );

  const handleCopyActivationLink = async (link: string) => {
    try {
      await Clipboard.setStringAsync(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showAlert('Copied', 'Activation link copied to clipboard.');
    } catch {
      showAlert('Notice', 'Failed to copy link automatically.');
    }
  };

  const handleShareWhatsAppActivation = (link: string, phone?: string) => {
    const text = encodeURIComponent(
      `Hello! Please use this link to activate your store account: ${link}`
    );
    if (phone) {
      const cleanDigits = phone.replace(/\D/g, '');
      const num = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
      Linking.openURL(`https://wa.me/${num}?text=${text}`);
    } else {
      Linking.openURL(`https://wa.me/?text=${text}`);
    }
  };

  const handleSendDirectNotification = async () => {
    if (!notifyTarget || !notifTitle.trim() || !notifMessage.trim()) {
      showAlert('Validation', 'Please enter both a title and message.');
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
      showAlert('Success', 'Notification sent to customer.');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to send notification.'));
    } finally {
      setSendingNotif(false);
    }
  };

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalCount },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount },
    { key: 'locked', label: 'Locked', count: lockedCount },
    ...(deleteRequestedCount > 0
      ? [{ key: 'delete_requested' as TabKey, label: 'Deletion Req', count: deleteRequestedCount }]
      : []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Customer Directory"
        subtitle={`${totalCount} registered accounts`}
      />

      <FlatList
        data={displayedCustomers}
        keyExtractor={customerKeyExtractor}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS !== 'web'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCustomers(true);
            }}
            tintColor="#10b981"
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* 4 Interactive Top Summary KPI Cards */}
            <View style={styles.kpiGrid}>
              {/* Total Customers */}
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  activeTab === 'all' && [styles.kpiCardActive, { borderColor: '#6366f1' }],
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('all')}
              >
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TOTAL CUSTOMERS</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{totalCount}</Text>
                  <Text style={[styles.kpiSub, { color: colors.textMuted }]}>All registered</Text>
                </View>
                <View
                  style={[
                    styles.kpiIconBox,
                    { backgroundColor: activeTab === 'all' ? '#6366f1' : isDark ? '#312e81' : '#e0e7ff' },
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={20}
                    color={activeTab === 'all' ? '#ffffff' : '#4f46e5'}
                  />
                </View>
              </TouchableOpacity>

              {/* Active Customers */}
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  activeTab === 'active' && [styles.kpiCardActive, { borderColor: '#10b981' }],
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('active')}
              >
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: '#059669' }]}>ACTIVE</Text>
                  <Text style={[styles.kpiValue, { color: '#059669' }]}>{activeCount}</Text>
                  <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Shopping active</Text>
                </View>
                <View
                  style={[
                    styles.kpiIconBox,
                    { backgroundColor: activeTab === 'active' ? '#10b981' : isDark ? '#064e3b' : '#d1fae5' },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={activeTab === 'active' ? '#ffffff' : '#059669'}
                  />
                </View>
              </TouchableOpacity>

              {/* Inactive Customers */}
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  activeTab === 'inactive' && [styles.kpiCardActive, { borderColor: '#64748b' }],
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('inactive')}
              >
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>INACTIVE</Text>
                  <Text style={[styles.kpiValue, { color: colors.text }]}>{inactiveCount}</Text>
                  <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Pending verify</Text>
                </View>
                <View
                  style={[
                    styles.kpiIconBox,
                    { backgroundColor: activeTab === 'inactive' ? '#64748b' : isDark ? '#334155' : '#f1f5f9' },
                  ]}
                >
                  <Ionicons
                    name="person-remove"
                    size={20}
                    color={activeTab === 'inactive' ? '#ffffff' : '#475569'}
                  />
                </View>
              </TouchableOpacity>

              {/* Locked Accounts */}
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  activeTab === 'locked' && [styles.kpiCardActive, { borderColor: '#ef4444' }],
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveTab('locked')}
              >
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: '#dc2626' }]}>LOCKED</Text>
                  <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{lockedCount}</Text>
                  <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Brute-force / blocked</Text>
                </View>
                <View
                  style={[
                    styles.kpiIconBox,
                    { backgroundColor: activeTab === 'locked' ? '#ef4444' : isDark ? '#7f1d1d' : '#fee2e2' },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={activeTab === 'locked' ? '#ffffff' : '#dc2626'}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Pending Deletion Alert Banner */}
            {deleteRequestedCount > 0 && (
              <View
                style={[
                  styles.deletionAlert,
                  { backgroundColor: isDark ? '#451a03' : '#fffbeb', borderColor: '#fde68a' },
                ]}
              >
                <View style={styles.deletionAlertLeft}>
                  <View style={styles.deletionIconBox}>
                    <Ionicons name="warning-outline" size={20} color="#b45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deletionAlertTitle, { color: isDark ? '#fef3c7' : '#92400e' }]}>
                      {deleteRequestedCount} Deletion Request{deleteRequestedCount > 1 ? 's' : ''} Pending
                    </Text>
                    <Text style={[styles.deletionAlertSub, { color: isDark ? '#fde68a' : '#b45309' }]}>
                      Review and approve or reject customer deletion requests.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[
                    styles.deletionReviewBtn,
                    activeTab === 'delete_requested' && { backgroundColor: '#78350f' },
                  ]}
                  onPress={() => setActiveTab('delete_requested')}
                >
                  <Text style={styles.deletionReviewBtnText}>Review Requests</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Search Input */}
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, phone, email, username..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Horizontal Filter Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
            >
              {TABS.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.tabPill,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setActiveTab(t.key)}
                  >
                    <Text
                      style={[
                        styles.tabPillText,
                        { color: colors.textMuted },
                        isActive && { color: '#ffffff', fontWeight: 'bold' },
                      ]}
                    >
                      {t.label} ({t.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        }
        renderItem={renderCustomerItem}
        ListEmptyComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconBox, { backgroundColor: colors.cardAlt }]}>
                <Ionicons name="people-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery ? 'No matching customers found' : 'No customers in this view'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {searchQuery
                  ? `No customers match "${searchQuery}". Try a different name, email, or phone.`
                  : activeTab === 'inactive'
                  ? 'There are currently no inactive accounts.'
                  : activeTab === 'locked'
                  ? 'No accounts are currently locked.'
                  : activeTab === 'delete_requested'
                  ? 'There are no pending customer deletion requests.'
                  : 'Registered customer accounts will appear here.'}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={[styles.clearSearchBtn, { backgroundColor: colors.cardAlt }]}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={[styles.clearSearchText, { color: colors.text }]}>Clear Search</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )
        }
      />

      {/* Customer Detail Profile Modal */}
      <Modal visible={Boolean(selectedCustomer)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.profileHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.profileHeaderLeft}>
                <View
                  style={[
                    styles.avatarSmall,
                    { backgroundColor: isDark ? '#312e81' : '#e0e7ff' },
                  ]}
                >
                  <Ionicons name="person" size={18} color="#4f46e5" />
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.profileTitle, { color: colors.text }]}>
                      {selectedCustomer?.first_name
                        ? `${selectedCustomer.first_name} ${selectedCustomer?.last_name || ''}`.trim()
                        : selectedCustomer?.username || 'Customer Profile'}
                    </Text>
                    {customerDetails?.is_active ? (
                      <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                        <Text style={[styles.badgeText, { color: '#059669' }]}>Active</Text>
                      </View>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                        <Text style={[styles.badgeText, { color: '#64748b' }]}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.profileSub, { color: colors.textMuted }]}>
                    ID: #{selectedCustomer?.id} • @{selectedCustomer?.username}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedCustomer(null)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 40 }} />
            ) : (
              <ScrollView style={styles.profileBody} showsVerticalScrollIndicator={false}>
                {/* 3-Column Metrics Grid */}
                <View style={styles.profileMetrics}>
                  <View
                    style={[
                      styles.profileMetricBox,
                      { backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderColor: '#c7d2fe' },
                    ]}
                  >
                    <Text style={[styles.profileMetricLabel, { color: '#4f46e5' }]}>LIFETIME SALES</Text>
                    <Text style={[styles.profileMetricVal, { color: '#4f46e5' }]}>
                      ₹{Number(customerDetails?.total_spent || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.profileMetricBox,
                      { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', borderColor: '#a7f3d0' },
                    ]}
                  >
                    <Text style={[styles.profileMetricLabel, { color: '#059669' }]}>TOTAL ORDERS</Text>
                    <Text style={[styles.profileMetricVal, { color: '#059669' }]}>
                      {customerDetails?.total_orders ?? 0}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.profileMetricBox,
                      { backgroundColor: isDark ? '#451a03' : '#fffbeb', borderColor: '#fde68a' },
                    ]}
                  >
                    <Text style={[styles.profileMetricLabel, { color: '#d97706' }]}>WALLET CASH</Text>
                    <Text style={[styles.profileMetricVal, { color: '#d97706' }]}>
                      ₹{Number(customerDetails?.wallet_balance || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Inactive Account Activation Card */}
                {!customerDetails?.is_active && (
                  <View
                    style={[
                      styles.sectionCard,
                      { backgroundColor: isDark ? '#451a03' : '#fffbeb', borderColor: '#fde68a' },
                    ]}
                  >
                    <View style={styles.sectionHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sectionCardTitle, { color: '#b45309' }]}>
                          Account Inactive (Pending Verification)
                        </Text>
                        <Text style={[styles.sectionCardSub, { color: isDark ? '#fde68a' : '#92400e' }]}>
                          This customer has not activated their account yet.
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleActivate(customerDetails.id, customerDetails.username)}
                      >
                        <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
                        <Text style={styles.smallActionBtnText}>Activate</Text>
                      </TouchableOpacity>
                    </View>

                    {customerDetails?.activation_link ? (
                      <View style={styles.activationLinkBox}>
                        <Text style={[styles.fieldLabel, { color: '#92400e', marginBottom: 4 }]}>
                          ACCOUNT ACTIVATION LINK:
                        </Text>
                        <View style={styles.linkRow}>
                          <TextInput
                            editable={false}
                            selectTextOnFocus
                            value={customerDetails.activation_link}
                            style={[
                              styles.linkInput,
                              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
                            ]}
                          />
                          <TouchableOpacity
                            style={[styles.copyBtn, { backgroundColor: '#f59e0b' }]}
                            onPress={() => handleCopyActivationLink(customerDetails.activation_link)}
                          >
                            <Ionicons
                              name={copiedLink ? 'checkmark' : 'copy-outline'}
                              size={15}
                              color="#fff"
                            />
                            <Text style={styles.copyBtnText}>{copiedLink ? 'Copied' : 'Copy'}</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={[styles.whatsappShareBtn, { backgroundColor: '#10b981' }]}
                          onPress={() =>
                            handleShareWhatsAppActivation(
                              customerDetails.activation_link,
                              customerDetails.customer_profile?.mobile_number
                            )
                          }
                        >
                          <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                          <Text style={styles.whatsappShareBtnText}>Share Link via WhatsApp</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Account Security & Brute-Force Lockout Card */}
                <View
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: customerDetails?.is_locked
                        ? isDark
                          ? '#450a0a'
                          : '#fef2f2'
                        : colors.cardAlt,
                      borderColor: customerDetails?.is_locked ? '#fca5a5' : colors.border,
                    },
                  ]}
                >
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color={customerDetails?.is_locked ? '#dc2626' : '#059669'}
                      />
                      <Text style={[styles.sectionCardTitle, { color: colors.text }]}>
                        Account Security & Lockout Status
                      </Text>
                    </View>
                    {customerDetails?.is_locked ? (
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleUnlock(customerDetails.id, customerDetails.username)}
                      >
                        <Ionicons name="lock-open-outline" size={14} color="#fff" />
                        <Text style={styles.smallActionBtnText}>Unlock Account</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.smallActionBtn, { backgroundColor: '#dc2626' }]}
                        onPress={() => handlePromptLock(customerDetails)}
                      >
                        <Ionicons name="lock-closed-outline" size={14} color="#fff" />
                        <Text style={styles.smallActionBtnText}>Manually Lock</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.securityGrid}>
                    <View style={[styles.securityCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ACCESS STATUS</Text>
                      <Text
                        style={[
                          styles.securityValue,
                          { color: customerDetails?.is_locked ? '#dc2626' : '#059669' },
                        ]}
                      >
                        {customerDetails?.is_locked ? 'Locked (Blocked)' : 'Normal (Granted)'}
                      </Text>
                    </View>
                    <View style={[styles.securityCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>FAILED LOGINS</Text>
                      <Text
                        style={[
                          styles.securityValue,
                          {
                            color:
                              (customerDetails?.failed_login_attempts || 0) >= 10
                                ? '#dc2626'
                                : (customerDetails?.failed_login_attempts || 0) > 5
                                ? '#d97706'
                                : colors.text,
                          },
                        ]}
                      >
                        {customerDetails?.failed_login_attempts || 0} / 10 threshold
                      </Text>
                    </View>
                  </View>

                  {customerDetails?.is_locked && (
                    <View
                      style={[
                        styles.lockoutReasonBox,
                        { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2', borderColor: '#fca5a5' },
                      ]}
                    >
                      <Text style={[styles.lockoutReasonTitle, { color: '#991b1b' }]}>
                        Lock Reason:
                      </Text>
                      <Text style={[styles.lockoutReasonText, { color: isDark ? '#fecaca' : '#7f1d1d' }]}>
                        {customerDetails.lockout_reason || '10 consecutive failed login attempts'}
                      </Text>
                      {customerDetails.locked_at ? (
                        <Text style={[styles.lockoutTimeText, { color: '#b91c1c' }]}>
                          Locked at: {new Date(customerDetails.locked_at).toLocaleString()}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  {customerDetails?.last_failed_login_ip && (
                    <View
                      style={[
                        styles.ipBox,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.ipText, { color: colors.textMuted }]}>
                        Last Failed IP:{' '}
                        <Text style={{ fontWeight: 'bold', color: colors.text }}>
                          {customerDetails.last_failed_login_ip}
                        </Text>
                      </Text>
                      {customerDetails.last_failed_login_at && (
                        <Text style={[styles.ipTimeText, { color: colors.textMuted }]}>
                          {new Date(customerDetails.last_failed_login_at).toLocaleString()}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Contact Information */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Contact Information</Text>

                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Full Name</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>
                      {customerDetails?.first_name
                        ? `${customerDetails.first_name} ${customerDetails?.last_name || ''}`.trim()
                        : 'Customer'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Username</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>
                      @{customerDetails?.username}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>
                      {customerDetails?.email || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Mobile</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>
                      {customerDetails?.customer_profile?.mobile_number
                        ? `+91 ${customerDetails.customer_profile.mobile_number}`
                        : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Date of Birth</Text>
                    <Text style={[styles.infoVal, { color: colors.text }]}>
                      {customerDetails?.customer_profile?.dob || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Referral Code</Text>
                    <Text style={[styles.infoVal, { color: colors.text, fontWeight: 'bold' }]}>
                      {customerDetails?.customer_profile?.referral_code || 'N/A'}
                    </Text>
                  </View>

                  {/* Phone & WhatsApp Action Shortcuts */}
                  {customerDetails?.customer_profile?.mobile_number && (
                    <View style={styles.contactShortcuts}>
                      <TouchableOpacity
                        style={[styles.shortcutBtn, { backgroundColor: '#3b82f6' }]}
                        onPress={() =>
                          Linking.openURL(`tel:${customerDetails.customer_profile.mobile_number}`)
                        }
                      >
                        <Ionicons name="call" size={15} color="#fff" />
                        <Text style={styles.shortcutBtnText}>Call Customer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.shortcutBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => {
                          const cleanDigits = String(
                            customerDetails.customer_profile.mobile_number
                          ).replace(/\D/g, '');
                          const num = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
                          Linking.openURL(`https://wa.me/${num}`);
                        }}
                      >
                        <Ionicons name="logo-whatsapp" size={15} color="#fff" />
                        <Text style={styles.shortcutBtnText}>WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Saved Delivery Addresses */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Saved Delivery Addresses</Text>
                  {Array.isArray(customerDetails?.addresses) && customerDetails.addresses.length > 0 ? (
                    customerDetails.addresses.map((addr: any, idx: number) => (
                      <View
                        key={idx}
                        style={[styles.addressBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Ionicons name="location-outline" size={16} color="#6366f1" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={[styles.addressText, { color: colors.text }]}>
                            {addr.address_line || addr.address || 'Address line'}
                          </Text>
                          {addr.pincode && (
                            <Text style={[styles.addressPin, { color: colors.textMuted }]}>
                              Pincode: {addr.pincode}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
                      No saved addresses recorded.
                    </Text>
                  )}
                </View>

                {/* Recent Orders Section */}
                <View style={[styles.sectionCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
                  {Array.isArray(customerDetails?.recent_orders) &&
                  customerDetails.recent_orders.length > 0 ? (
                    customerDetails.recent_orders.map((ord: any) => (
                      <TouchableOpacity
                        key={ord.id}
                        style={[styles.orderItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedCustomer(null);
                          router.push(`/(tabs)/orders/${ord.id}`);
                        }}
                      >
                        <View>
                          <Text style={[styles.orderIdText, { color: '#6366f1' }]}>
                            Order #{ord.id}
                          </Text>
                          <Text style={[styles.orderDateText, { color: colors.textMuted }]}>
                            {ord.created_at ? new Date(ord.created_at).toLocaleDateString() : ''}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.orderAmountText, { color: colors.text }]}>
                            ₹{Number(ord.total_amount || 0).toFixed(2)}
                          </Text>
                          <View
                            style={[
                              styles.orderStatusPill,
                              {
                                backgroundColor:
                                  ord.status === 'DELIVERED'
                                    ? '#d1fae5'
                                    : ord.status === 'CANCELLED' || ord.status === 'REJECTED'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.orderStatusText,
                                {
                                  color:
                                    ord.status === 'DELIVERED'
                                      ? '#059669'
                                      : ord.status === 'CANCELLED' || ord.status === 'REJECTED'
                                      ? '#dc2626'
                                      : '#b45309',
                                },
                              ]}
                            >
                              {ord.status}
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
                      No recent orders found for this customer.
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Lock Reason Prompt Modal */}
      <Modal visible={Boolean(lockTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Ionicons name="lock-closed" size={20} color="#ef4444" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Lock Account: {lockTarget?.username}
              </Text>
            </View>
            <Text style={[styles.modalPrompt, { color: colors.textMuted }]}>
              Enter a reason for manually locking this account. The customer will be barred from logging in until unlocked.
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g. Suspicious activity or requested block"
              placeholderTextColor={colors.textMuted}
              value={lockReason}
              onChangeText={setLockReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setLockTarget(null)}
                disabled={lockingAccount}
              >
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendModalBtn, { backgroundColor: '#dc2626' }]}
                onPress={handleConfirmLock}
                disabled={lockingAccount}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {lockingAccount ? 'Locking...' : 'Lock Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Direct Push Notification Modal */}
      <Modal visible={Boolean(notifyTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Ionicons name="notifications" size={20} color="#3b82f6" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Notify {notifyTarget?.first_name || notifyTarget?.username}
              </Text>
            </View>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Notification Title (e.g. Special Offer!)"
              placeholderTextColor={colors.textMuted}
              value={notifTitle}
              onChangeText={setNotifTitle}
            />
            <TextInput
              style={[
                styles.modalInput,
                {
                  height: 90,
                  textAlignVertical: 'top',
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Type notification message here..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setNotifyTarget(null)}
                disabled={sendingNotif}
              >
                <Text style={{ color: colors.textMuted, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendModalBtn}
                onPress={handleSendDirectNotification}
                disabled={sendingNotif}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {sendingNotif ? 'Sending...' : 'Send Notification'}
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
  headerSection: {
    marginBottom: 12,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiCardActive: {
    borderWidth: 2,
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    marginTop: 1,
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  deletionAlert: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  deletionAlertLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deletionIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletionAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  deletionAlertSub: {
    fontSize: 11,
    marginTop: 1,
  },
  deletionReviewBtn: {
    backgroundColor: '#b45309',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  deletionReviewBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
  },
  subText: {
    fontSize: 11,
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 6,
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
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  clearSearchBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clearSearchText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  profileHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  profileSub: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  profileBody: {
    padding: 16,
  },
  profileMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  profileMetricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  profileMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  profileMetricVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smallActionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  activationLinkBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  linkInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontFamily: 'monospace',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  whatsappShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  whatsappShareBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  securityGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  securityCell: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  securityValue: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },
  lockoutReasonBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  lockoutReasonTitle: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  lockoutReasonText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  lockoutTimeText: {
    fontSize: 10,
    marginTop: 3,
  },
  ipBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ipText: {
    fontSize: 11,
  },
  ipTimeText: {
    fontSize: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  infoLabel: {
    fontSize: 12,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactShortcuts: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  shortcutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
  },
  shortcutBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addressPin: {
    fontSize: 10,
    marginTop: 2,
  },
  emptySectionText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 6,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
  },
  orderDateText: {
    fontSize: 10,
    marginTop: 2,
  },
  orderAmountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  orderStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  orderStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalPrompt: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
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
    borderRadius: 10,
  },
});
