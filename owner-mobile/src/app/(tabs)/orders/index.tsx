import React, { useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';

interface OrderItemProps {
  item: any;
  onPress: (id: number) => void;
}

function formatSafeDate(dateVal: any): string {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  } catch {
    return '—';
  }
}

// Memoized List Item to prevent unnecessary re-renders when parent state changes
const OrderItem = memo(({ item, onPress }: OrderItemProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW':
        return '#eab308';
      case 'ACCEPTED':
      case 'PREPARING':
      case 'READY':
      case 'OUT_FOR_DELIVERY':
        return '#3b82f6';
      case 'COMPLETED':
        return '#10b981';
      case 'REJECTED':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => item?.id && onPress(item.id)}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Order #{item?.id ?? '—'}</Text>
        <View style={[styles.badge, { backgroundColor: getStatusColor(item?.status) }]}>
          <Text style={styles.badgeText}>{item?.status || 'Unknown'}</Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.customerName}>
          <Ionicons name="person" size={14} /> {item?.customer_name || 'Customer'}
        </Text>
        <Text style={styles.amount}>₹{item?.total_amount ?? '0.00'}</Text>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>{formatSafeDate(item?.created_at)}</Text>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </View>
    </TouchableOpacity>
  );
});

const STATUS_TABS = ['All', 'New', 'Active', 'Completed', 'Cancelled'];

export default function OrdersListScreen() {
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const fetchOrders = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setErrorMsg(null);
      try {
        const response = await (api as ApiInstance).cachedGet('/orders/', { forceRefresh });
        const raw = response?.data?.results ?? response?.data;
        setOrders(Array.isArray(raw) ? raw : []);
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const handlePressOrder = useCallback(
    (id: number) => {
      router.push(`/(tabs)/orders/${id}`);
    },
    [router]
  );

  // DSA Application: Use a Hash Map (Object dictionary) to group orders by status in O(N) time.
  const groupedOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const map: Record<string, any[]> = {
      All: safeOrders,
      New: [],
      Active: [],
      Completed: [],
      Cancelled: [],
    };

    for (let i = 0; i < safeOrders.length; i++) {
      const order = safeOrders[i];
      if (!order) continue;
      const status = order.status;

      if (status === 'NEW') {
        map.New.push(order);
      } else if (['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(status)) {
        map.Active.push(order);
      } else if (status === 'COMPLETED') {
        map.Completed.push(order);
      } else if (status === 'REJECTED') {
        map.Cancelled.push(order);
      }
    }
    return map;
  }, [orders]);

  const displayedOrders = groupedOrders[activeTab] || [];

  const renderItem = useCallback(
    ({ item }: { item: any }) => <OrderItem item={item} onPress={handlePressOrder} />,
    [handlePressOrder]
  );

  const keyExtractor = useCallback(
    (item: any, index: number) => (item?.id != null ? String(item.id) : `order-${index}`),
    []
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Orders</Text>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab} ({groupedOrders[tab]?.length || 0})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity onPress={() => fetchOrders(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#475569" />
              <Text style={styles.emptyText}>No orders in this category.</Text>
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
    backgroundColor: '#0f172a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
  },
  tabContainer: {
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#334155',
  },
  tabBtnActive: {
    backgroundColor: '#10b981',
  },
  tabText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fecaca',
    flex: 1,
    fontSize: 13,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 12,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderId: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  customerName: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  amount: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
  },
  date: {
    color: '#64748b',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
});
