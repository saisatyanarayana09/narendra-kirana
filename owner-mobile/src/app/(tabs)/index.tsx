import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { showAlert, showConfirm } from '../../utils/alerts';
import { safeStorage } from '../../utils/storage';

type OrderQuickFilter = 'ALL' | 'NEW';

interface BentoAction {
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgLight: string;
  bgDark: string;
  route: string;
}

const BENTO_ACTIONS: BentoAction[] = [
  {
    label: 'Add Product',
    sub: 'New item or SKU',
    icon: 'add-circle',
    color: '#4f46e5',
    bgLight: '#eef2ff',
    bgDark: 'rgba(79, 70, 229, 0.18)',
    route: '/(tabs)/products/new',
  },
  {
    label: 'Delivery Fleet',
    sub: 'Riders & dispatches',
    icon: 'bicycle',
    color: '#059669',
    bgLight: '#ecfdf5',
    bgDark: 'rgba(5, 150, 105, 0.18)',
    route: '/(tabs)/more/delivery',
  },
  {
    label: 'Tax Invoices',
    sub: 'Billing & CSV export',
    icon: 'document-text',
    color: '#2563eb',
    bgLight: '#eff6ff',
    bgDark: 'rgba(37, 99, 235, 0.18)',
    route: '/(tabs)/more/invoices',
  },
  {
    label: 'Broadcast',
    sub: 'Customer push alert',
    icon: 'megaphone',
    color: '#db2777',
    bgLight: '#fdf2f8',
    bgDark: 'rgba(219, 39, 119, 0.18)',
    route: '/(tabs)/more/broadcast',
  },
  {
    label: 'Promo Offers',
    sub: 'Discount coupons',
    icon: 'pricetag',
    color: '#d97706',
    bgLight: '#fffbeb',
    bgDark: 'rgba(217, 119, 6, 0.18)',
    route: '/(tabs)/more/offers',
  },
  {
    label: 'Referrals',
    sub: 'Rewards & milestones',
    icon: 'gift',
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    bgDark: 'rgba(124, 58, 237, 0.18)',
    route: '/(tabs)/more/referrals',
  },
];

const PIPELINE_STEPS = ['NEW', 'ACCEPTED', 'PREPARING', 'READY'];

export default function DashboardScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { isDark, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [orders, setOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [ownerName, setOwnerName] = useState('Owner');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [orderFilter, setOrderFilter] = useState<OrderQuickFilter>('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        if (forceRefresh) {
          (api as ApiInstance).clearCache();
        }

        const [ordersRes, analyticsRes] = await Promise.all([
          (api as ApiInstance).cachedGet('/orders/', { forceRefresh }),
          (api as ApiInstance).cachedGet('/orders/analytics/', { forceRefresh }),
        ]);

        const rawOrders = ordersRes?.data?.results ?? ordersRes?.data;
        setOrders(Array.isArray(rawOrders) ? rawOrders : []);
        setAnalytics(analyticsRes?.data ?? null);
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (authLoading || !token) return;

    safeStorage.getItem('smart-kirana-owner-user').then((raw) => {
      if (raw) {
        try {
          const u = JSON.parse(raw);
          const full = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username;
          if (full) setOwnerName(full);
        } catch {}
      }
    });

    api
      .get('/accounts/profile/')
      .then((res) => {
        if (res?.data) {
          safeStorage.setItem('smart-kirana-owner-user', JSON.stringify(res.data));
          const full =
            [res.data.first_name, res.data.last_name].filter(Boolean).join(' ') ||
            res.data.username ||
            'Owner';
          setOwnerName(full);
        }
      })
      .catch(() => {});

    fetchDashboardData(false);
  }, [authLoading, token, fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const handleQuickOrderAction = async (orderId: string, newStatus: string) => {
    const runUpdate = async () => {
      setUpdatingOrderId(orderId);
      try {
        await api.patch(`/orders/${orderId}/status/`, { status: newStatus });
        (api as ApiInstance).clearCache();
        await fetchDashboardData(true);
      } catch (e: any) {
        showAlert('Update Failed', getErrorMessage(e, 'Could not update order status.'));
      } finally {
        setUpdatingOrderId(null);
      }
    };

    if (newStatus === 'REJECTED') {
      showConfirm(
        'Reject Order',
        'Are you sure you want to reject this order?',
        runUpdate,
        undefined,
        'Reject'
      );
    } else {
      runUpdate();
    }
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateString = now.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const { newOrdersCount, activeOrders, filteredActiveOrders } = useMemo(() => {
    let newCnt = 0;
    const liveList: any[] = [];

    const sorted = [...orders].sort(
      (a, b) =>
        new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
    );

    for (const o of sorted) {
      if (!o) continue;
      if (o.status === 'NEW') newCnt++;
      if (['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)) {
        liveList.push(o);
      }
    }

    const filtered = liveList.filter((o) => {
      if (orderFilter === 'NEW') return o.status === 'NEW';
      return true;
    });

    return {
      newOrdersCount: newCnt,
      activeOrders: liveList,
      filteredActiveOrders: filtered,
    };
  }, [orders, orderFilter]);

  const getStatusTheme = (status: string) => {
    switch (status) {
      case 'NEW':
        return {
          accent: '#e11d48',
          bg: isDark ? 'rgba(225, 29, 72, 0.16)' : '#fff1f2',
          text: isDark ? '#fda4af' : '#be123c',
          border: isDark ? 'rgba(225, 29, 72, 0.35)' : '#fecdd3',
          label: 'NEW • NEEDS APPROVAL',
          stepIndex: 0,
        };
      case 'ACCEPTED':
        return {
          accent: '#2563eb',
          bg: isDark ? 'rgba(37, 99, 235, 0.16)' : '#eff6ff',
          text: isDark ? '#93c5fd' : '#1d4ed8',
          border: isDark ? 'rgba(37, 99, 235, 0.35)' : '#bfdbfe',
          label: 'ACCEPTED',
          stepIndex: 1,
        };
      case 'PREPARING':
        return {
          accent: '#d97706',
          bg: isDark ? 'rgba(217, 119, 6, 0.16)' : '#fffbeb',
          text: isDark ? '#fcd34d' : '#b45309',
          border: isDark ? 'rgba(217, 119, 6, 0.35)' : '#fde68a',
          label: 'PACKING ITEMS',
          stepIndex: 2,
        };
      case 'READY':
        return {
          accent: '#7c3aed',
          bg: isDark ? 'rgba(124, 58, 237, 0.16)' : '#f5f3ff',
          text: isDark ? '#c4b5fd' : '#6d28d9',
          border: isDark ? 'rgba(124, 58, 237, 0.35)' : '#ddd6fe',
          label: 'READY FOR DISPATCH',
          stepIndex: 3,
        };
      case 'OUT_FOR_DELIVERY':
        return {
          accent: '#059669',
          bg: isDark ? 'rgba(5, 150, 105, 0.16)' : '#ecfdf5',
          text: isDark ? '#6ee7b7' : '#047857',
          border: isDark ? 'rgba(5, 150, 105, 0.35)' : '#a7f3d0',
          label: 'OUT FOR DELIVERY',
          stepIndex: 3,
        };
      default:
        return {
          accent: '#64748b',
          bg: colors.cardAlt,
          text: colors.textMuted,
          border: colors.border,
          label: status,
          stepIndex: 0,
        };
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
      }
    >
      <View style={styles.maxContainer}>
        {/* 1. Executive Hero Summary Card */}
        <View style={styles.heroBanner}>
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={11} color="#34d399" />
                <Text style={styles.datePillText}>{dateString.toUpperCase()}</Text>
              </View>
              <Text style={styles.heroGreeting}>
                {greeting}, {ownerName}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.heroRefreshBtn}
              onPress={() => onRefresh()}
              accessibilityLabel="Refresh Dashboard"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#34d399" />
              ) : (
                <Ionicons name="refresh" size={18} color="#f8fafc" />
              )}
            </TouchableOpacity>
          </View>

          {/* Dual Interactive Highlight Cards Inside Hero */}
          <View style={styles.heroMetricsRow}>
            {/* Card A: Needs Approval */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.heroMetricBox,
                orderFilter === 'NEW' && styles.heroMetricBoxSelectedRose,
              ]}
              onPress={() => setOrderFilter((prev) => (prev === 'NEW' ? 'ALL' : 'NEW'))}
            >
              <View style={styles.heroMetricTop}>
                <View style={[styles.heroIconCircle, { backgroundColor: 'rgba(244, 63, 94, 0.2)' }]}>
                  <Ionicons name="notifications" size={16} color="#fb7185" />
                </View>
                <View
                  style={[
                    styles.heroMiniTag,
                    {
                      backgroundColor:
                        newOrdersCount > 0
                          ? 'rgba(244, 63, 94, 0.25)'
                          : 'rgba(148, 163, 184, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroMiniTagText,
                      { color: newOrdersCount > 0 ? '#fda4af' : '#94a3b8' },
                    ]}
                  >
                    {orderFilter === 'NEW' ? 'FILTERED' : 'TAP TO FILTER'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroMetricValue}>
                {loading ? '—' : newOrdersCount}
              </Text>
              <Text style={styles.heroMetricLabel}>Needs Approval</Text>
              <Text style={styles.heroMetricSub}>
                {activeOrders.length} active in queue
              </Text>
            </TouchableOpacity>

            {/* Card B: Today's Revenue */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroMetricBox}
              onPress={() => router.push('/(tabs)/more/reports')}
            >
              <View style={styles.heroMetricTop}>
                <View
                  style={[
                    styles.heroIconCircle,
                    { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Ionicons name="trending-up" size={16} color="#34d399" />
                </View>
                <View
                  style={[
                    styles.heroMiniTag,
                    { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Text style={[styles.heroMiniTagText, { color: '#6ee7b7' }]}>
                    ANALYTICS ↗
                  </Text>
                </View>
              </View>

              <Text style={styles.heroMetricValue} numberOfLines={1}>
                ₹{loading ? '—' : analytics?.today_sales ?? 0}
              </Text>
              <Text style={styles.heroMetricLabel}>{"Today's Revenue"}</Text>
              <Text style={styles.heroMetricSub} numberOfLines={1}>
                Week: ₹{loading ? '0' : analytics?.weekly_sales ?? 0}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Tactile Bento Grid Shortcuts (2x3 on Mobile, 3x2 on Tablet/Desktop) */}
        <View style={styles.bentoSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
            QUICK STORE SHORTCUTS
          </Text>
          <View style={styles.bentoGrid}>
            {BENTO_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.75}
                style={[
                  styles.bentoCard,
                  {
                    width: isWide ? '32%' : '48.4%',
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => router.push(item.route as any)}
              >
                <View
                  style={[
                    styles.bentoIconWrap,
                    { backgroundColor: isDark ? item.bgDark : item.bgLight },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.bentoTextCol}>
                  <Text
                    style={[styles.bentoTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.bentoSub, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {item.sub}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. Live Order Queue Section */}
        <View style={styles.queueSection}>
          <View style={styles.queueHeaderRow}>
            <View style={styles.queueTitleLeft}>
              <View style={styles.livePulseDot} />
              <Text style={[styles.queueTitle, { color: colors.text }]}>
                Live Order Queue
              </Text>
              <View
                style={[
                  styles.queueCountBadge,
                  { backgroundColor: colors.cardAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.queueCountText, { color: colors.text }]}>
                  {filteredActiveOrders.length}
                </Text>
              </View>
            </View>

            {/* Clean 2-Pill Filter Switcher */}
            <View
              style={[
                styles.miniSegmented,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.miniSegBtn,
                  orderFilter === 'ALL' && {
                    backgroundColor: colors.card,
                  },
                ]}
                onPress={() => setOrderFilter('ALL')}
              >
                <Text
                  style={[
                    styles.miniSegText,
                    {
                      color:
                        orderFilter === 'ALL' ? colors.text : colors.textMuted,
                    },
                  ]}
                >
                  All ({activeOrders.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.miniSegBtn,
                  orderFilter === 'NEW' && {
                    backgroundColor: colors.card,
                  },
                ]}
                onPress={() => setOrderFilter('NEW')}
              >
                <Text
                  style={[
                    styles.miniSegText,
                    {
                      color:
                        orderFilter === 'NEW' ? '#e11d48' : colors.textMuted,
                    },
                  ]}
                >
                  New ({newOrdersCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading && orders.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                Syncing live orders...
              </Text>
            </View>
          ) : filteredActiveOrders.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.emptyBadgeCircle}>
                <Ionicons name="checkmark-done" size={28} color="#10b981" />
              </View>
              <Text style={[styles.emptyTitleText, { color: colors.text }]}>
                {orderFilter === 'NEW'
                  ? 'No orders waiting for approval'
                  : 'All active orders fulfilled!'}
              </Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>
                New incoming customer orders will appear here automatically.
              </Text>
              {orderFilter === 'NEW' && activeOrders.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.showAllQueueBtn,
                    { backgroundColor: colors.cardAlt, borderColor: colors.border },
                  ]}
                  onPress={() => setOrderFilter('ALL')}
                >
                  <Text style={[styles.showAllQueueText, { color: colors.text }]}>
                    Show {activeOrders.length} Active Orders
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.orderList}>
              {filteredActiveOrders.map((order) => {
                const st = getStatusTheme(order.status);
                const timeStr = order.created_at
                  ? new Date(order.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                const customerInitial = String(order.customer_name || 'G')
                  .trim()
                  .charAt(0)
                  .toUpperCase();

                return (
                  <View
                    key={order.id}
                    style={[
                      styles.orderCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderLeftColor: st.accent,
                      },
                    ]}
                  >
                    {/* Tappable Body -> Order Details */}
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={styles.orderCardBody}
                      onPress={() => router.push(`/(tabs)/orders/${order.id}`)}
                    >
                      {/* Row 1: #ID + Status Badge + Fulfillment Type + Time */}
                      <View style={styles.orderTopMetaRow}>
                        <View style={styles.orderBadgesLeft}>
                          <View
                            style={[
                              styles.idChip,
                              { backgroundColor: colors.cardAlt },
                            ]}
                          >
                            <Text style={[styles.idChipText, { color: colors.text }]}>
                              #{order.id}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusChip,
                              {
                                backgroundColor: st.bg,
                                borderColor: st.border,
                              },
                            ]}
                          >
                            <Text style={[styles.statusChipText, { color: st.text }]}>
                              {st.label}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.modeChip,
                              { backgroundColor: colors.cardAlt },
                            ]}
                          >
                            <Text
                              style={[
                                styles.modeChipText,
                                { color: colors.textMuted },
                              ]}
                            >
                              {order.order_type === 'PICKUP'
                                ? '🏪 Pickup'
                                : '🛵 Delivery'}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.timeLabel, { color: colors.textMuted }]}>
                          {timeStr}
                        </Text>
                      </View>

                      {/* Row 2: Customer Avatar + Name/Items + Price & Call */}
                      <View style={styles.customerMainRow}>
                        <View
                          style={[
                            styles.avatarCircle,
                            { backgroundColor: colors.cardAlt },
                          ]}
                        >
                          <Text style={[styles.avatarLetter, { color: colors.text }]}>
                            {customerInitial}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.customerNameText, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {order.customer_name || 'Guest Customer'}
                          </Text>
                          <Text
                            style={[styles.itemsMetaText, { color: colors.textMuted }]}
                          >
                            {order.items_count ?? order.items?.length ?? 0} items •{' '}
                            {order.payment_method || 'COD'}
                          </Text>
                        </View>

                        <View style={styles.priceAndCallRight}>
                          {order.customer_phone ? (
                            <TouchableOpacity
                              style={[
                                styles.callIconBtn,
                                {
                                  backgroundColor: isDark
                                    ? 'rgba(16, 185, 129, 0.16)'
                                    : '#ecfdf5',
                                },
                              ]}
                              onPress={() =>
                                Linking.openURL(`tel:${order.customer_phone}`)
                              }
                            >
                              <Ionicons name="call" size={15} color="#10b981" />
                            </TouchableOpacity>
                          ) : null}

                          <View style={styles.priceWrap}>
                            <Text style={[styles.orderTotalText, { color: colors.text }]}>
                              ₹{order.total_amount}
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color={colors.textMuted}
                            />
                          </View>
                        </View>
                      </View>

                      {/* Row 3: 4-Stage Visual Order Progress Bar */}
                      <View style={styles.stepperTrack}>
                        {PIPELINE_STEPS.map((stepKey, idx) => {
                          const completed = idx <= st.stepIndex;
                          return (
                            <View
                              key={stepKey}
                              style={[
                                styles.stepperSegment,
                                {
                                  backgroundColor: completed
                                    ? st.accent
                                    : colors.cardAlt,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                    </TouchableOpacity>

                    {/* Row 4: Full-Width Action Bar */}
                    <View
                      style={[
                        styles.orderActionFooter,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      {updatingOrderId === order.id ? (
                        <ActivityIndicator
                          size="small"
                          color="#10b981"
                          style={{ flex: 1, paddingVertical: 8 }}
                        />
                      ) : (
                        <>
                          {order.status === 'NEW' && (
                            <>
                              <TouchableOpacity
                                style={styles.rejectActionBtn}
                                onPress={() =>
                                  handleQuickOrderAction(order.id, 'REJECTED')
                                }
                              >
                                <Ionicons name="close" size={16} color="#e11d48" />
                                <Text style={styles.rejectActionText}>Reject</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.acceptActionBtn}
                                onPress={() =>
                                  handleQuickOrderAction(order.id, 'ACCEPTED')
                                }
                              >
                                <Ionicons name="checkmark" size={18} color="#ffffff" />
                                <Text style={styles.acceptActionText}>
                                  Accept Order
                                </Text>
                              </TouchableOpacity>
                            </>
                          )}

                          {order.status === 'ACCEPTED' && (
                            <TouchableOpacity
                              style={[
                                styles.nextStageBtn,
                                { backgroundColor: '#2563eb' },
                              ]}
                              onPress={() =>
                                handleQuickOrderAction(order.id, 'PREPARING')
                              }
                            >
                              <Ionicons name="cube-outline" size={17} color="#ffffff" />
                              <Text style={styles.nextStageBtnText}>
                                Start Packing Items
                              </Text>
                            </TouchableOpacity>
                          )}

                          {order.status === 'PREPARING' && (
                            <TouchableOpacity
                              style={[
                                styles.nextStageBtn,
                                { backgroundColor: '#7c3aed' },
                              ]}
                              onPress={() => handleQuickOrderAction(order.id, 'READY')}
                            >
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={17}
                                color="#ffffff"
                              />
                              <Text style={styles.nextStageBtnText}>
                                Mark Order Ready
                              </Text>
                            </TouchableOpacity>
                          )}

                          {order.status === 'READY' && (
                            <TouchableOpacity
                              style={[
                                styles.nextStageBtn,
                                { backgroundColor: '#059669' },
                              ]}
                              onPress={() =>
                                handleQuickOrderAction(
                                  order.id,
                                  order.order_type === 'PICKUP'
                                    ? 'COMPLETED'
                                    : 'OUT_FOR_DELIVERY'
                                )
                              }
                            >
                              <Ionicons
                                name={
                                  order.order_type === 'PICKUP'
                                    ? 'bag-check-outline'
                                    : 'bicycle-outline'
                                }
                                size={17}
                                color="#ffffff"
                              />
                              <Text style={styles.nextStageBtnText}>
                                {order.order_type === 'PICKUP'
                                  ? 'Complete Customer Pickup'
                                  : 'Dispatch for Delivery'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          {order.status === 'OUT_FOR_DELIVERY' && (
                            <TouchableOpacity
                              style={[
                                styles.nextStageBtn,
                                { backgroundColor: '#10b981' },
                              ]}
                              onPress={() =>
                                router.push(`/(tabs)/orders/${order.id}`)
                              }
                            >
                              <Ionicons
                                name="shield-checkmark-outline"
                                size={17}
                                color="#ffffff"
                              />
                              <Text style={styles.nextStageBtnText}>
                                Enter Delivery OTP & Complete
                              </Text>
                            </TouchableOpacity>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 36,
  },
  maxContainer: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    gap: 18,
  },
  heroBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    boxShadow: '0px 6px 14px rgba(15, 23, 42, 0.18)',
    elevation: 5,
    gap: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  datePillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroGreeting: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroMetricBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heroMetricBoxSelectedRose: {
    borderColor: '#fb7185',
    backgroundColor: 'rgba(225, 29, 72, 0.14)',
  },
  heroMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMiniTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroMiniTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroMetricValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heroMetricLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  heroMetricSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  bentoSection: {
    gap: 8,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    paddingHorizontal: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoCard: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  bentoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoTextCol: {
    flex: 1,
  },
  bentoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bentoSub: {
    fontSize: 11,
    marginTop: 1,
  },
  queueSection: {
    gap: 12,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  queueTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  queueCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  queueCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniSegmented: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  miniSegBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  miniSegText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 36,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBadgeCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  showAllQueueBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  showAllQueueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  orderList: {
    gap: 12,
  },
  orderCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  orderCardBody: {
    padding: 14,
    gap: 12,
  },
  orderTopMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderBadgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  idChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  idChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  customerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 15,
    fontWeight: '800',
  },
  customerNameText: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemsMetaText: {
    fontSize: 12,
    marginTop: 1,
  },
  priceAndCallRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  orderTotalText: {
    fontSize: 18,
    fontWeight: '800',
  },
  stepperTrack: {
    flexDirection: 'row',
    gap: 5,
  },
  stepperSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  orderActionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  rejectActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  rejectActionText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  acceptActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  nextStageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  nextStageBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
