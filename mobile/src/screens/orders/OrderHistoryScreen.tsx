import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';

export function OrderHistoryScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Request counter to completely prevent race conditions
  const requestIdRef = useRef(0);

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const fetchOrders = async (pageNum: number, isRefresh = false, isLoadMore = false) => {
    if (isLoadMore) {
      if (loadingMore || !hasMore || loading || refreshing) return;
      setLoadingMore(true);
    } else if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const currentReqId = ++requestIdRef.current;

    try {
      const url = pageNum === 1 ? '/orders/' : `/orders/?page=${pageNum}`;
      const res = await apiClient.get(url);

      // Discard results if a newer request was dispatched while this was in-flight
      if (currentReqId !== requestIdRef.current) return;

      const rawData = res.data;
      const newOrders = Array.isArray(rawData) ? rawData : (rawData?.results || []);

      if (pageNum === 1) {
        setOrders(newOrders);
      } else {
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => String(o.id)));
          const uniqueNew = newOrders.filter((o: any) => !existingIds.has(String(o.id)));
          return [...prev, ...uniqueNew];
        });
      }

      setHasMore(Boolean(rawData?.next));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (currentReqId === requestIdRef.current) {
        if (isLoadMore) setLoadingMore(false);
        if (isRefresh) setRefreshing(false);
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    setPage(1);
    fetchOrders(1, true, false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading && !refreshing && !loadingMore) {
      fetchOrders(page + 1, false, true);
    }
  };

  // Status badges matching web tokens (COMPLETED emerald, REJECTED rose, READY blue, PREPARING amber, NEW indigo)
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' }; // emerald
      case 'REJECTED':
        return { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' }; // rose
      case 'READY':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' }; // blue
      case 'PREPARING':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' }; // amber
      case 'NEW':
        return { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' }; // indigo
      default:
        return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' }; // slate
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('HomeTab');
    }
  };

  if (loading && page === 1 && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web OrdersHistory 1:1 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={18} color="#64748B" />
          <Text style={styles.backButtonText}>Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <Text style={styles.headerSubtitle}>Track and review your past purchases.</Text>
      </View>
      
      {orders.length === 0 ? (
        <View style={styles.emptyContent}>
          <View style={styles.emptyIconCircle}>
            <Feather name="package" size={48} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            It looks like you haven't placed any orders yet. Once you make a purchase, it will appear here so you can track its status.
          </Text>
          <TouchableOpacity 
            style={styles.startShoppingBtn}
            onPress={() => navigation.navigate('HomeTab')}
            activeOpacity={0.85}
          >
            <Text style={styles.startShoppingBtnText}>Start Shopping →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
          renderItem={({ item }) => {
            const statusStyle = getStatusStyle(item.status);
            const totalFormatted = parseFloat(item.total_amount || 0).toFixed(2);
            const itemCount = item.items?.length || 0;

            return (
              <View style={styles.orderCard}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: item.id })}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderId}>#{item.id}</Text>
                      <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.cardFooterRow}>
                    <Text style={styles.itemCountText}>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Text>
                    <View style={styles.totalBlock}>
                      <Text style={styles.totalLabel}>TOTAL</Text>
                      <Text style={styles.totalAmount}>₹{totalFormatted}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActionFooter}>
                  {item.status === 'COMPLETED' ? (
                    <View style={styles.completedActionsRow}>
                      <TouchableOpacity 
                        style={styles.detailsBtn}
                        onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: item.id })}
                        activeOpacity={0.7}
                      >
                        <Feather name="package" size={14} color="#334155" />
                        <Text style={styles.detailsBtnText}>Track Order</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.invoiceCardBtn}
                        onPress={() => navigation.navigate('InvoiceScreen', { orderId: item.id })}
                        activeOpacity={0.7}
                      >
                        <Feather name="file-text" size={14} color="#047857" />
                        <Text style={styles.invoiceCardBtnText}>View Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.trackOrderBtn}
                      onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: item.id })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.trackOrderBtnText}>Track Order</Text>
                      <Feather name="arrow-right" size={14} color="#047857" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={() => 
            loadingMore ? (
              <ActivityIndicator style={{ margin: 20 }} color="#059669" />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  startShoppingBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startShoppingBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  itemCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  totalBlock: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 19,
    fontWeight: '900',
    color: '#0F172A',
  },
  cardActionFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  completedActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  detailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  invoiceCardBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoiceCardBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  trackOrderBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  trackOrderBtnText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '800',
  },
});


