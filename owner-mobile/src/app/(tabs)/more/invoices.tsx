import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';

const InvoiceRow = memo(({ item, onPress }: { item: any; onPress: (id: number) => void }) => {
  const method = String(item?.payment_method || 'COD').toUpperCase();
  const isCompleted = item?.status === 'COMPLETED';

  return (
    <TouchableOpacity style={styles.card} onPress={() => item?.id && onPress(item.id)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.invoiceId}>INV-#{item?.id ?? '—'}</Text>
          <Text style={styles.customerName}>{item?.customer_name || 'Walk-in / Guest'}</Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.amount}>₹{item?.total_amount ?? '0.00'}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, method === 'UPI' ? styles.upiBadge : styles.codBadge]}>
              <Text style={styles.badgeText}>{method}</Text>
            </View>
            <View style={[styles.badge, isCompleted ? styles.doneBadge : styles.activeBadge]}>
              <Text style={styles.badgeText}>{item?.status || 'NEW'}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {item?.created_at ? new Date(item.created_at).toLocaleString() : '—'}
        </Text>
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText}>Open Order</Text>
          <Ionicons name="chevron-forward" size={14} color="#10b981" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function InvoicesScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'UPI' | 'COD'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'ACTIVE'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (forceRefresh = false) => {
    setErrorMsg(null);
    try {
      const res = await (api as ApiInstance).cachedGet('/orders/', { forceRefresh });
      const raw = res?.data?.results ?? res?.data;
      setOrders(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        setErrorMsg(getErrorMessage(e, 'Failed to load store invoices.'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices(true);
  }, [fetchInvoices]);

  const filteredOrders = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const q = searchTerm.trim().toLowerCase();

    return safeOrders.filter((order) => {
      if (!order) return false;
      if (q) {
        const idMatch = String(order.id || '').toLowerCase().includes(q);
        const nameMatch = String(order.customer_name || '').toLowerCase().includes(q);
        const addrMatch = String(order.delivery_address || '').toLowerCase().includes(q);
        const upiMatch = String(order.upi_transaction_id || '').toLowerCase().includes(q);
        if (!idMatch && !nameMatch && !addrMatch && !upiMatch) return false;
      }

      if (paymentFilter !== 'ALL') {
        const method = String(order.payment_method || 'COD').toUpperCase();
        if (paymentFilter !== method) return false;
      }

      if (statusFilter === 'COMPLETED' && order.status !== 'COMPLETED') return false;
      if (statusFilter === 'ACTIVE' && (order.status === 'COMPLETED' || order.status === 'REJECTED')) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, paymentFilter, statusFilter]);

  const metrics = useMemo(() => {
    let totalBilled = 0;
    let upiTotal = 0;
    let codTotal = 0;

    for (let i = 0; i < filteredOrders.length; i++) {
      const o = filteredOrders[i];
      const amount = parseFloat(String(o?.total_amount ?? 0)) || 0;
      totalBilled += amount;
      const method = String(o?.payment_method || 'COD').toUpperCase();
      if (method === 'UPI') upiTotal += amount;
      else codTotal += amount;
    }

    return {
      totalBilled: totalBilled.toFixed(2),
      upiTotal: upiTotal.toFixed(2),
      codTotal: codTotal.toFixed(2),
      count: filteredOrders.length,
    };
  }, [filteredOrders]);

  const handleOpenOrder = useCallback(
    (id: number) => {
      router.push(`/(tabs)/orders/${id}`);
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => <InvoiceRow item={item} onPress={handleOpenOrder} />,
    [handleOpenOrder]
  );

  return (
    <View style={styles.container}>
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Total Billed ({metrics.count})</Text>
          <Text style={styles.metricVal}>₹{metrics.totalBilled}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>UPI / COD</Text>
          <Text style={styles.metricSubVal}>
            ₹{metrics.upiTotal} / ₹{metrics.codTotal}
          </Text>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoice #, customer, UPI ref..."
            placeholderTextColor="#64748b"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {(['ALL', 'UPI', 'COD'] as const).map((p) => (
            <TouchableOpacity
              key={`pay-${p}`}
              style={[styles.pill, paymentFilter === p && styles.pillActive]}
              onPress={() => setPaymentFilter(p)}
            >
              <Text style={[styles.pillText, paymentFilter === p && styles.pillTextActive]}>
                {p === 'ALL' ? 'All Payments' : p}
              </Text>
            </TouchableOpacity>
          ))}
          {(['ALL', 'COMPLETED', 'ACTIVE'] as const).map((s) => (
            <TouchableOpacity
              key={`st-${s}`}
              style={[styles.pill, statusFilter === s && styles.pillActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.pillText, statusFilter === s && styles.pillTextActive]}>
                {s === 'ALL' ? 'All Status' : s}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, idx) => (item?.id != null ? String(item.id) : `inv-${idx}`)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
          ListEmptyComponent={<Text style={styles.emptyText}>No matching invoices found.</Text>}
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
  metricsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
  },
  metricVal: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricSubVal: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filterSection: {
    padding: 12,
    backgroundColor: '#1e293b',
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
    fontSize: 14,
  },
  pillsRow: {
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#334155',
  },
  pillActive: {
    backgroundColor: '#10b981',
  },
  pillText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
  errorBox: {
    backgroundColor: '#450a0a',
    margin: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  errorText: {
    color: '#fecaca',
    fontSize: 13,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  invoiceId: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customerName: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amount: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  upiBadge: {
    backgroundColor: '#4f46e5',
  },
  codBadge: {
    backgroundColor: '#475569',
  },
  doneBadge: {
    backgroundColor: '#059669',
  },
  activeBadge: {
    backgroundColor: '#d97706',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 8,
  },
  dateText: {
    color: '#64748b',
    fontSize: 12,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewBtnText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});
