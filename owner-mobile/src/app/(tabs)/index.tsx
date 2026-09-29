import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import api, { ApiInstance, getErrorMessage } from '../../services/api';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';

const ACTIVE_STATUSES = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];

export default function DashboardScreen() {
  const { token } = useAuth();
  const [sales, setSales] = useState<number | string>(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setErrorMsg(null);
      try {
        const [analyticsResult, ordersResult] = await Promise.allSettled([
          (api as ApiInstance).cachedGet('/orders/analytics/', { forceRefresh }),
          (api as ApiInstance).cachedGet('/orders/', { forceRefresh }),
        ]);

        if (analyticsResult.status === 'fulfilled' && analyticsResult.value?.data) {
          const analyticsData = analyticsResult.value.data;
          setSales(analyticsData.today_sales ?? 0);
        }

        if (ordersResult.status === 'fulfilled' && ordersResult.value?.data) {
          const rawOrders = ordersResult.value.data?.results ?? ordersResult.value.data;
          const ordersList = Array.isArray(rawOrders) ? rawOrders : [];
          setRecentOrders(ordersList.slice(0, 5));

          let activeCount = 0;
          for (let i = 0; i < ordersList.length; i++) {
            if (ACTIVE_STATUSES.includes(ordersList[i]?.status)) {
              activeCount++;
            }
          }
          setActiveOrdersCount(activeCount);
        } else if (ordersResult.status === 'rejected') {
          const reason = ordersResult.reason;
          if (reason?.response?.status !== 401) {
            setErrorMsg(getErrorMessage(reason, 'Could not load dashboard data.'));
          }
        }
      } catch (e: any) {
        if (e?.response?.status !== 401) {
          setErrorMsg(getErrorMessage(e, 'Could not load dashboard data.'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Today&apos;s Sales</Text>
          <Text style={styles.metricValue}>₹{sales}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricTitle}>Active Orders</Text>
          <Text style={styles.metricValue}>{activeOrdersCount}</Text>
        </View>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDashboardData(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Recent Orders</Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 24 }} />
      ) : recentOrders.length > 0 ? (
        recentOrders.map((order, index) => (
          <TouchableOpacity
            key={order?.id ? String(order.id) : `order-${index}`}
            style={styles.orderCard}
            onPress={() => order?.id && router.push(`/(tabs)/orders/${order.id}`)}
          >
            <View>
              <Text style={styles.orderId}>Order #{order?.id ?? '—'}</Text>
              <Text style={styles.orderStatus}>
                {order?.customer_name ? `${order.customer_name} • ` : ''}
                {order?.status ?? 'NEW'}
              </Text>
            </View>
            <Text style={styles.orderAmount}>₹{order?.total_amount ?? '0.00'}</Text>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent orders</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metricCard: {
    backgroundColor: '#1e293b',
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricTitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  metricValue: {
    color: '#10b981',
    fontSize: 24,
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    borderColor: '#dc2626',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderStatus: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
  },
  orderAmount: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
  },
});
