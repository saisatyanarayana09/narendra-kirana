import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Linking,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useAppTheme } from '../../../context/ThemeContext';
import { showAlert, showConfirm } from '../../../utils/alerts';

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'NEW', label: 'New', dot: '#f43f5e' },
  { key: 'ACCEPTED', label: 'Accepted', dot: '#3b82f6' },
  { key: 'PREPARING', label: 'Packing', dot: '#f59e0b' },
  { key: 'READY', label: 'Ready', dot: '#8b5cf6' },
  { key: 'OUT_FOR_DELIVERY', label: 'Dispatched', dot: '#06b6d4' },
  { key: 'COMPLETED', label: 'Done', dot: '#10b981' },
  { key: 'REJECTED', label: 'Rejected', dot: '#64748b' },
];

const getStatusMeta = (status: string, orderType: string | undefined, isDark: boolean, colors: any) => {
  switch (status) {
    case 'NEW':
      return {
        label: 'New Order',
        dot: '#f43f5e',
        bg: isDark ? 'rgba(244, 63, 94, 0.14)' : '#fff1f2',
        text: isDark ? '#fda4af' : '#e11d48',
        nextLabel: 'Accept',
        nextStatus: 'ACCEPTED',
        nextColor: '#10b981',
      };
    case 'ACCEPTED':
      return {
        label: 'Accepted',
        dot: '#3b82f6',
        bg: isDark ? 'rgba(59, 130, 246, 0.14)' : '#eff6ff',
        text: isDark ? '#93c5fd' : '#2563eb',
        nextLabel: 'Start Packing',
        nextStatus: 'PREPARING',
        nextColor: '#3b82f6',
      };
    case 'PREPARING':
      return {
        label: 'Packing',
        dot: '#f59e0b',
        bg: isDark ? 'rgba(245, 158, 11, 0.14)' : '#fffbeb',
        text: isDark ? '#fcd34d' : '#d97706',
        nextLabel: 'Pack Items',
        nextStatus: null as string | null,
        routeToDetails: true,
        nextColor: '#8b5cf6',
      };
    case 'READY':
      return {
        label: 'Ready',
        dot: '#8b5cf6',
        bg: isDark ? 'rgba(139, 92, 246, 0.14)' : '#f5f3ff',
        text: isDark ? '#c4b5fd' : '#7c3aed',
        nextLabel: orderType === 'PICKUP' ? 'Complete Pickup' : 'Dispatch',
        nextStatus: orderType === 'PICKUP' ? 'COMPLETED' : 'OUT_FOR_DELIVERY',
        nextColor: '#059669',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'On the Way',
        dot: '#06b6d4',
        bg: isDark ? 'rgba(6, 182, 212, 0.14)' : '#ecfeff',
        text: isDark ? '#67e8f9' : '#0891b2',
        nextLabel: 'Complete',
        nextStatus: 'COMPLETED',
        nextColor: '#10b981',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        dot: '#10b981',
        bg: isDark ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4',
        text: isDark ? '#6ee7b7' : '#15803d',
        nextLabel: null,
        nextStatus: null,
        nextColor: '#10b981',
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        dot: '#64748b',
        bg: isDark ? 'rgba(100, 116, 139, 0.16)' : '#f1f5f9',
        text: isDark ? '#94a3b8' : '#64748b',
        nextLabel: null,
        nextStatus: null,
        nextColor: '#64748b',
      };
    default:
      return {
        label: status || 'Pending',
        dot: '#64748b',
        bg: colors.cardAlt,
        text: colors.textMuted,
        nextLabel: null,
        nextStatus: null,
        nextColor: '#64748b',
      };
  }
};

const OrderCard = React.memo(({ 
  order, 
  isExpanded, 
  detailData, 
  loadingDetailId, 
  updatingOrderId, 
  onToggleExpand, 
  onRejectOrder, 
  onQuickStatusUpdate 
}: any) => {
  const { isDark, colors } = useAppTheme();
  const router = useRouter();
  
  const meta = getStatusMeta(order?.status, order?.order_type, isDark, colors);
  const timeStr = order?.created_at
    ? new Date(order.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const dateStr = order?.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })
    : '';
  const itemsList: any[] = Array.isArray(detailData?.items)
    ? detailData.items
    : [];
  const itemCount =
    order.items_count ?? (itemsList.length > 0 ? itemsList.length : 0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isExpanded ? '#10b981' : colors.border,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.cardMainTouch}
        onPress={() => onToggleExpand(order, isExpanded, !!detailData?.items)}
      >
        <View style={styles.rowTop}>
          <View style={styles.customerCol}>
            <Text
              style={[styles.orderIdFull, { color: colors.text }]}
              selectable
            >
              #{order.id}
            </Text>
            <Text
              style={[styles.customerName, { color: colors.text }]}
              numberOfLines={1}
            >
              {order.customer_name || 'Guest Customer'}
            </Text>
            <Text style={[styles.subMetaLine, { color: colors.textMuted }]}>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} •{' '}
              {order.order_type === 'PICKUP' ? 'Pickup' : 'Delivery'} •{' '}
              {order.payment_method || 'COD'}
              {dateStr ? ` • ${dateStr}` : ''}{timeStr ? `, ${timeStr}` : ''}
            </Text>
          </View>

          <View style={styles.priceRightCol}>
            <Text style={[styles.priceText, { color: colors.text }]}>
              ₹{order.total_amount}
            </Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={15}
              color={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.rowBottom}>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <View
              style={[styles.statusDot, { backgroundColor: meta.dot }]}
            />
            <Text style={[styles.statusLabel, { color: meta.text }]}>
              {meta.label}
            </Text>
          </View>

          <View style={styles.inlineActionsRight}>
            {updatingOrderId === order.id ? (
              <ActivityIndicator size="small" color="#10b981" />
            ) : (
              <>
                {order.status === 'NEW' && (
                  <TouchableOpacity
                    style={[
                      styles.rejectIconBtn,
                      { borderColor: 'rgba(244, 63, 94, 0.3)' },
                    ]}
                    onPress={() => onRejectOrder(order)}
                  >
                    <Ionicons name="close" size={15} color="#f43f5e" />
                  </TouchableOpacity>
                )}

                {meta.nextLabel && (meta.nextStatus || (meta as any).routeToDetails) ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.nextStepPillBtn,
                      { backgroundColor: meta.nextColor },
                    ]}
                    onPress={() => {
                      if ((meta as any).routeToDetails) {
                        router.push(`/(tabs)/orders/${order.id}`);
                      } else if (meta.nextStatus) {
                        onQuickStatusUpdate(order.id, meta.nextStatus);
                      }
                    }}
                  >
                    <Text style={styles.nextStepPillText}>
                      {meta.nextLabel}
                    </Text>
                    <Ionicons
                      name={(meta as any).routeToDetails ? 'checkbox-outline' : 'arrow-forward'}
                      size={13}
                      color="#ffffff"
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.detailsGhostBtn,
                      { backgroundColor: colors.cardAlt },
                    ]}
                    onPress={() =>
                      router.push(`/(tabs)/orders/${order.id}`)
                    }
                  >
                    <Text
                      style={[
                        styles.detailsGhostText,
                        { color: colors.text },
                      ]}
                    >
                      Details
                    </Text>
                    <Ionicons
                      name="open-outline"
                      size={12}
                      color={colors.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View
          style={[
            styles.expandedDrawer,
            {
              backgroundColor: colors.cardAlt,
              borderTopColor: colors.border,
            },
          ]}
        >
          {loadingDetailId === order.id ? (
            <View style={styles.drawerLoadingRow}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text
                style={[
                  styles.drawerLoadingText,
                  { color: colors.textMuted },
                ]}
              >
                Loading items...
              </Text>
            </View>
          ) : itemsList.length > 0 ? (
            <View style={styles.drawerItemsList}>
              {itemsList.map((item: any, idx: number) => (
                <View
                  key={item?.id ?? idx}
                  style={styles.drawerItemRow}
                >
                  <Text
                    style={[
                      styles.drawerItemQty,
                      { color: '#10b981' },
                    ]}
                  >
                    {item.quantity}×
                  </Text>
                  <Text
                    style={[
                      styles.drawerItemName,
                      { color: colors.text },
                      item.status === 'REJECTED' && {
                        textDecorationLine: 'line-through',
                        color: '#f43f5e',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.product_name_snapshot}
                  </Text>
                  <Text
                    style={[
                      styles.drawerItemPrice,
                      { color: colors.textMuted },
                    ]}
                  >
                    ₹{item.subtotal ?? item.price_snapshot}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {detailData?.delivery_address &&
          detailData?.order_type !== 'PICKUP' ? (
            <View style={styles.drawerAddressRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text
                style={[
                  styles.drawerAddressText,
                  { color: colors.textMuted },
                ]}
                numberOfLines={2}
              >
                {detailData.delivery_address}
              </Text>
            </View>
          ) : null}

          <View style={styles.drawerActionsRow}>
            {detailData?.customer_phone ? (
              <TouchableOpacity
                style={[
                  styles.drawerChipBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() =>
                  Linking.openURL(
                    `tel:${detailData.customer_phone}`
                  ).catch(() => {})
                }
              >
                <Ionicons name="call-outline" size={14} color="#10b981" />
                <Text
                  style={[styles.drawerChipText, { color: colors.text }]}
                >
                  Call
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[
                styles.drawerPrimaryOpenBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => router.push(`/(tabs)/orders/${order.id}`)}
            >
              <Text
                style={[
                  styles.drawerChipText,
                  { color: colors.text, fontWeight: '700' },
                ]}
              >
                Order Details
              </Text>
              <Ionicons
                name="arrow-forward"
                size={14}
                color="#10b981"
              />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

export default function OrdersListScreen() {
  const { token } = useAuth();
  const { isDark, colors } = useAppTheme();
  const [orders, setOrders] = useState<any[]>([]);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | number | null>(null);
  const [orderDetailsMap, setOrderDetailsMap] = useState<Record<string, any>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  // ─── Sticky Header Scroll Tracking ───
  const listRef = useRef<FlatList>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY > 10 && !isScrolled) {
        setIsScrolled(true);
      } else if (offsetY <= 10 && isScrolled) {
        setIsScrolled(false);
      }
    },
    [isScrolled]
  );

  const fetchOrders = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setErrorMsg(null);
      try {
        const response = await (api as ApiInstance).cachedGet('/orders/?page_size=100', {
          forceRefresh,
          onUpdate: () => {
            void fetchOrders(false);
          },
        });
        const raw = response?.data?.results ?? response?.data;
        setOrders(Array.isArray(raw) ? raw : []);
        setNextPageUrl(response?.data?.next || null);
      } catch (error: any) {
        if (error?.response?.status !== 401) {
          setErrorMsg(getErrorMessage(error, 'Failed to fetch orders.'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  const loadMoreOrders = useCallback(async () => {
    if (!nextPageUrl || loadingMore || loading || refreshing) return;
    setLoadingMore(true);
    try {
      const url = nextPageUrl.includes('/api/v1')
        ? nextPageUrl.split('/api/v1')[1]
        : nextPageUrl;
      const res = await api.get(url);
      const moreRaw = res?.data?.results ?? res?.data;
      if (Array.isArray(moreRaw)) {
        setOrders((prev) => {
          const existingIds = new Set(prev.map((o) => String(o.id)));
          const uniqueNew = moreRaw.filter((o) => !existingIds.has(String(o.id)));
          return [...prev, ...uniqueNew];
        });
      }
      setNextPageUrl(res?.data?.next || null);
    } catch (e) {
      console.log('Error loading more previous orders:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, loadingMore, loading, refreshing]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const handleToggleExpand = useCallback(async (order: any, isCurrentlyExpanded: boolean, hasDetails: boolean) => {
    const idKey = String(order.id);
    if (isCurrentlyExpanded) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(order.id);

    // Lazy-load order items if not already loaded in list payload
    if (!order.items && !hasDetails) {
      setLoadingDetailId(order.id);
      try {
        const res = await api.get(`/orders/${order.id}/`);
        if (res?.data) {
          setOrderDetailsMap((prev) => ({ ...prev, [idKey]: res.data }));
        }
      } catch {
        // Fallback to summary data
      } finally {
        setLoadingDetailId(null);
      }
    }
  }, []);

  const handleQuickStatusUpdate = useCallback(async (orderId: string | number, nextStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status/`, { status: nextStatus });
      (api as ApiInstance).clearCache();
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      fetchOrders(true);
    } catch (err: any) {
      showAlert('Update Failed', getErrorMessage(err, 'Could not update order status.'));
    } finally {
      setUpdatingOrderId(null);
    }
  }, [fetchOrders]);

  const handleRejectOrder = useCallback((order: any) => {
    showConfirm(
      'Reject Order?',
      `Reject Order #${order.id} for ${order.customer_name || 'Customer'} (₹${order.total_amount})?`,
      () => handleQuickStatusUpdate(order.id, 'REJECTED'),
      undefined,
      'Reject Order'
    );
  }, [handleQuickStatusUpdate]);

  const { statusCounts, filteredOrders } = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const counts: Record<string, number> = {
      ALL: safeOrders.length,
      NEW: 0,
      ACCEPTED: 0,
      PREPARING: 0,
      READY: 0,
      OUT_FOR_DELIVERY: 0,
      COMPLETED: 0,
      REJECTED: 0,
    };

    const q = searchTerm.trim().toLowerCase();
    const matched: any[] = [];

    for (let i = 0; i < safeOrders.length; i++) {
      const order = safeOrders[i];
      if (!order) continue;
      const st = String(order.status || '');
      if (counts[st] !== undefined) {
        counts[st] += 1;
      }

      const matchesStatus = filter === 'ALL' || st === filter;
      const matchesSearch =
        !q ||
        String(order.id || '').toLowerCase().includes(q) ||
        String(order.customer_name || '').toLowerCase().includes(q) ||
        String(order.customer_phone || '').toLowerCase().includes(q);

      if (matchesStatus && matchesSearch) {
        matched.push(order);
      }
    }

    return { statusCounts: counts, filteredOrders: matched };
  }, [orders, filter, searchTerm]);



  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.maxContainer}>
        {/* 1. Status / Category Filter Tabs (Positioned at top, collapses on scroll) */}
        {!isScrolled && (
          <View style={styles.topSectionWrap}>
            <View style={styles.tabsWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsScroll}
              >
                {STATUS_TABS.map((tab) => {
                  const active = filter === tab.key;
                  const count = statusCounts[tab.key] ?? 0;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      activeOpacity={0.75}
                      onPress={() => setFilter(tab.key)}
                      style={[
                        styles.tabChip,
                        active
                          ? {
                              backgroundColor: isDark ? '#f8fafc' : '#0f172a',
                              borderColor: isDark ? '#f8fafc' : '#0f172a',
                            }
                          : {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                      ]}
                    >
                      {tab.dot && !active && count > 0 && (
                        <View style={[styles.tabDot, { backgroundColor: tab.dot }]} />
                      )}
                      <Text
                        style={[
                          styles.tabChipText,
                          {
                            color: active
                              ? isDark
                                ? '#0f172a'
                                : '#ffffff'
                              : colors.textMuted,
                            fontWeight: active ? '800' : '600',
                          },
                        ]}
                      >
                        {tab.label}
                      </Text>
                      {count > 0 && (
                        <Text
                          style={[
                            styles.tabCountText,
                            {
                              color: active
                                ? isDark
                                  ? '#475569'
                                  : '#cbd5e1'
                                : colors.textMuted,
                            },
                          ]}
                        >
                          {count}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}

        {/* 2. Sticky Search & Refresh Bar (Interchanged below categories, sticks on scroll) */}
        <View
          style={[
            styles.stickySearchBarWrap,
            {
              backgroundColor: colors.bg,
              borderBottomColor: isScrolled ? colors.border : 'transparent',
            },
            isScrolled && styles.stickySearchBarScrolled,
            isScrolled && isDark && styles.stickySearchBarScrolledDark,
            isScrolled && {
              ...Platform.select({
                web: {
                  boxShadow: isDark
                    ? '0 6px 20px rgba(0, 0, 0, 0.5)'
                    : '0 4px 16px rgba(15, 23, 42, 0.08)',
                } as any,
              }),
            },
          ]}
        >
          <View style={styles.topSearchRow}>
            <View
              style={[
                styles.searchPill,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search-outline" size={17} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search order ID, name, or phone..."
                placeholderTextColor={colors.textMuted}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={17} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.refreshCircleBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              onPress={onRefresh}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Ionicons name="refresh-outline" size={18} color={colors.text} />
              )}
            </TouchableOpacity>
          </View>

          {/* Active Filter Chip (Visible when scrolled and filter is active) */}
          {isScrolled && filter !== 'ALL' && (
            <View style={styles.activeFilterChipRow}>
              <TouchableOpacity
                style={[
                  styles.activeFilterChip,
                  {
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff',
                    borderColor: isDark ? 'rgba(59, 130, 246, 0.4)' : '#bfdbfe',
                  },
                ]}
                onPress={() => setFilter('ALL')}
              >
                <Text
                  style={[
                    styles.activeFilterChipText,
                    { color: isDark ? '#93c5fd' : '#2563eb' },
                  ]}
                >
                  Status: {STATUS_TABS.find((t) => t.key === filter)?.label || filter}
                </Text>
                <Ionicons
                  name="close-circle"
                  size={14}
                  color={isDark ? '#93c5fd' : '#2563eb'}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {errorMsg ? (
          <View style={styles.errorBannerWrap}>
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMsg}</Text>
              <TouchableOpacity onPress={() => fetchOrders(true)}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 3. Interactive Minimalist Order Cards */}
        {loading && !refreshing ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredOrders}
            keyExtractor={(item, idx) =>
              item?.id != null ? String(item.id) : `order-${idx}`
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#10b981"
              />
            }
            ListEmptyComponent={
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name="bag-handle-outline" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No orders found
                </Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Orders matching this filter will appear here.
                </Text>
              </View>
            }
            renderItem={({ item: order }) => (
              <OrderCard
                order={order}
                isExpanded={expandedOrderId === order.id}
                detailData={orderDetailsMap[String(order.id)] || order}
                loadingDetailId={loadingDetailId}
                updatingOrderId={updatingOrderId}
                onToggleExpand={handleToggleExpand}
                onRejectOrder={handleRejectOrder}
                onQuickStatusUpdate={handleQuickStatusUpdate}
              />
            )}
            onEndReached={loadMoreOrders}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  maxContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
  },
  topSectionWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  stickySearchBarWrap: {
    width: '100%',
    zIndex: 100,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
      },
    }),
  },
  stickySearchBarScrolled: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    paddingTop: 8,
    paddingBottom: 8,
  },
  stickySearchBarScrolledDark: {
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  activeFilterChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeFilterChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  topSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  refreshCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsWrap: {
    marginBottom: 2,
  },
  tabsScroll: {
    gap: 7,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tabChipText: {
    fontSize: 12,
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorBannerWrap: {
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 6,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    flex: 1,
  },
  retryText: {
    color: '#b91c1c',
    fontWeight: '800',
    marginLeft: 12,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
    paddingBottom: 28,
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    padding: 42,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardMainTouch: {
    padding: 14,
    gap: 12,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  customerCol: {
    flex: 1,
    gap: 2,
  },
  orderIdFull: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
  },
  subMetaLine: {
    fontSize: 11,
  },
  priceRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  inlineActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rejectIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  nextStepPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailsGhostText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandedDrawer: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  drawerLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  drawerLoadingText: {
    fontSize: 12,
  },
  drawerItemsList: {
    gap: 5,
  },
  drawerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drawerItemQty: {
    fontSize: 12,
    fontWeight: '800',
    minWidth: 22,
  },
  drawerItemName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  drawerItemPrice: {
    fontSize: 12,
    fontWeight: '600',
  },
  drawerAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  drawerAddressText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  drawerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  drawerChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  drawerPrimaryOpenBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  drawerChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
