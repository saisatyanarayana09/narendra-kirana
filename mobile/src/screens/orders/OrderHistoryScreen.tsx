import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function OrderHistoryScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

    try {
      const res = await apiClient.get(`/orders/?page=${pageNum}`);
      const newOrders = res.data.results || res.data || [];
      
      if (pageNum === 1) {
        setOrders(newOrders);
      } else {
        setOrders(prev => {
          const existingIds = new Set(prev.map(o => String(o.id)));
          const uniqueNew = newOrders.filter((o: any) => !existingIds.has(String(o.id)));
          return [...prev, ...uniqueNew];
        });
      }
      
      setHasMore(Boolean(res.data.next));
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (isLoadMore) setLoadingMore(false);
      if (isRefresh) setRefreshing(false);
      setLoading(false);
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'REJECTED':
        return { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' };
      case 'READY':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'PREPARING':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'ACCEPTED':
        return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'NEW':
        return { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' };
      default:
        return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading && page === 1 && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
      </View>
      
      {orders.length === 0 ? (
        <View style={styles.emptyContent}>
          <Feather name="package" size={64} color={theme.colors.border} />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>When you place orders, they will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          renderItem={({ item }) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <View style={styles.orderCard}>
                <TouchableOpacity 
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: item.id })}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.orderId}>Order #{item.id}</Text>
                      <Text style={styles.orderDate}>{formatDate(item.created_at)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.cardBody}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Items:</Text>
                      <Text style={styles.infoValue}>{item.items?.length || 0} items</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Total:</Text>
                      <Text style={styles.priceValue}>₹{item.total_amount}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Type:</Text>
                      <View style={styles.typeBadge}>
                        {item.order_type === 'DELIVERY' ? (
                          <Feather name="map-pin" size={12} color={theme.colors.textSecondary} />
                        ) : (
                          <Feather name="clock" size={12} color={theme.colors.textSecondary} />
                        )}
                        <Text style={styles.typeText}>{item.order_type}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardFooter}>
                  {item.status === 'COMPLETED' ? (
                    <View style={styles.completedActionsRow}>
                      <TouchableOpacity 
                        style={styles.detailsBtn}
                        onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: item.id })}
                      >
                        <Text style={styles.detailsBtnText}>Details</Text>
                        <Feather name="chevron-right" size={14} color={theme.colors.textSecondary} />
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.invoiceCardBtn}
                        onPress={() => navigation.navigate('InvoiceScreen', { orderId: item.id })}
                      >
                        <Feather name="file-text" size={14} color="#059669" />
                        <Text style={styles.invoiceCardBtnText}>Invoice</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.trackOrderBtn}
                      onPress={() => navigation.navigate('OrderTrackingScreen', { orderId: item.id })}
                    >
                      <Text style={styles.footerText}>Track Order Status</Text>
                      <Feather name="arrow-right" size={14} color={theme.colors.primary} />
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
              <ActivityIndicator style={{ margin: 20 }} color={theme.colors.primary} />
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptySubtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  listContainer: {
    padding: theme.spacing.md,
  },
  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoiceCardBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
  trackOrderBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});


