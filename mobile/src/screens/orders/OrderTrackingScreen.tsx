import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';

export function OrderTrackingScreen({ navigation, route }: { navigation: AppNavigationProp; route: any }) {
  const { colors, isDark } = useTheme();
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchOrderDetails = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    }
    try {
      const res = await apiClient.get(`/orders/${orderId}/`, { params: { t: Date.now() } });
      setOrder(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching order details:', err);
      if (!order) {
        setError('Could not load this order.');
      }
    } finally {
      setLoading(false);
      if (isPullRefresh) setRefreshing(false);
    }
  }, [orderId, order]);

  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    fetchOrderDetails();

    // Live polling every 5 seconds until completed or rejected
    interval = setInterval(() => {
      if (isMounted) {
        apiClient.get(`/orders/${orderId}/`, { params: { t: Date.now() } })
          .then(res => {
            if (isMounted) {
              setOrder(res.data);
              if (res.data.status === 'COMPLETED' || res.data.status === 'REJECTED') {
                if (interval) {
                  clearInterval(interval);
                  interval = null;
                }
              }
            }
          })
          .catch(() => {});
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [orderId]);

  if (loading && !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color="#E11D48" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryBtn} 
            onPress={() => { setLoading(true); fetchOrderDetails(); }}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) return null;

  const isDelivery = order.order_type === 'DELIVERY';
  const isRejected = order.status === 'REJECTED';

  // 5-Stage Timeline: Order Placed, Accepted, Preparing, Out for Delivery / Ready for Pickup, Delivered / Completed
  const stages = [
    { 
      id: 'NEW', 
      title: 'Order Placed', 
      desc: 'We received your order', 
      icon: 'check-circle' as const 
    },
    { 
      id: 'ACCEPTED', 
      title: 'Accepted', 
      desc: 'Store confirmed your order', 
      icon: 'check-square' as const 
    },
    { 
      id: 'PREPARING', 
      title: 'Preparing', 
      desc: 'Store is packing your items', 
      icon: 'package' as const 
    },
    { 
      id: 'READY', 
      title: isDelivery ? 'Out for Delivery' : 'Ready for Pickup', 
      desc: isDelivery ? 'Your order is on the way!' : 'Waiting for you at the store', 
      icon: (isDelivery ? 'truck' : 'shopping-bag') as keyof typeof Feather.glyphMap 
    },
    { 
      id: 'COMPLETED', 
      title: isDelivery ? 'Delivered' : 'Completed', 
      desc: isDelivery ? 'Order delivered successfully' : 'Order picked up successfully', 
      icon: 'check-circle' as const 
    },
  ];

  const statusOrder = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
  const currentIndex = statusOrder.indexOf(order.status);

  const activeSubtotal = (order.items || [])
    .filter((i: any) => i.status !== 'REJECTED')
    .reduce((sum: number, item: any) => {
      const itemSub = parseFloat(item.subtotal || item.price_snapshot || '0');
      return sum + itemSub;
    }, 0);

  const getOrderStatusBadge = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'REJECTED':
          return { label: 'Order Cancelled', bg: 'rgba(244, 63, 94, 0.15)', text: '#FB7185' };
        case 'COMPLETED':
          return { label: 'Order Completed', bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399' };
        case 'READY':
          return { label: 'Order Ready', bg: 'rgba(59, 130, 246, 0.15)', text: '#60A5FA' };
        case 'PREPARING':
          return { label: 'Order Preparing', bg: 'rgba(245, 158, 11, 0.15)', text: '#FBBF24' };
        case 'NEW':
          return { label: 'Order Placed', bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399' };
        default:
          return { label: 'Order Confirmed', bg: 'rgba(16, 185, 129, 0.15)', text: '#34D399' };
      }
    }
    switch (status) {
      case 'REJECTED':
        return { label: 'Order Cancelled', bg: '#FFF1F2', text: '#E11D48' };
      case 'COMPLETED':
        return { label: 'Order Completed', bg: '#ECFDF5', text: '#059669' };
      case 'READY':
        return { label: 'Order Ready', bg: '#EFF6FF', text: '#2563EB' };
      case 'PREPARING':
        return { label: 'Order Preparing', bg: '#FFFBEB', text: '#D97706' };
      case 'NEW':
        return { label: 'Order Placed', bg: '#ECFDF5', text: '#059669' };
      default:
        return { label: 'Order Confirmed', bg: '#ECFDF5', text: '#059669' };
    }
  };

  const statusBadge = getOrderStatusBadge(order.status);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchOrderDetails(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Order Header matching web cart.jsx OrderDetailPage */}
        <View style={styles.orderHeaderSection}>
          <View style={{ flex: 1 }}>
            <View style={[styles.orderStatusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.orderStatusBadgeText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
            <Text style={[styles.orderIdText, { color: colors.text }]}>#{order.id}</Text>
          </View>
          {order.status === 'COMPLETED' && (
            <TouchableOpacity 
              style={[styles.viewInvoiceHeaderBtn, { backgroundColor: isDark ? colors.surface : '#0F172A', borderWidth: isDark ? 1 : 0, borderColor: colors.border }]}
              onPress={() => navigation.navigate('InvoiceScreen', { orderId: order.id })}
              activeOpacity={0.8}
            >
              <Feather name="file-text" size={15} color="#FFFFFF" />
              <Text style={styles.viewInvoiceHeaderBtnText}>View Invoice</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 5-Stage Tracking Timeline Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Track Order</Text>

          {isRejected ? (
            <View style={styles.rejectedBanner}>
              <Feather name="x-circle" size={32} color="#E11D48" />
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectedBannerTitle}>Order Cancelled</Text>
                <Text style={styles.rejectedBannerSubtitle}>
                  This order was cancelled and any wallet balance has been refunded.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.timelineWrapper}>
              {stages.map((step, index) => {
                const isCompleted = currentIndex >= index;
                const isActive = currentIndex === index;
                const isLast = index === stages.length - 1;

                return (
                  <View 
                    key={step.id} 
                    style={[styles.timelineStepRow, !isCompleted && styles.timelineStepDimmed]}
                  >
                    <View style={styles.stepIndicatorCol}>
                      <View 
                        style={[
                          styles.stepBadge,
                          isCompleted ? styles.stepBadgeCompleted : [styles.stepBadgePending, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', borderColor: colors.border }],
                          isActive && styles.stepBadgeActive,
                        ]}
                      >
                        <Feather 
                          name={step.icon} 
                          size={18} 
                          color={isCompleted ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B')} 
                        />
                      </View>
                      {!isLast && (
                        <View 
                          style={[
                            styles.stepConnectorLine,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
                            currentIndex > index && styles.stepConnectorLineCompleted,
                          ]} 
                        />
                      )}
                    </View>

                    <View style={styles.stepDetailsCol}>
                      <Text 
                        style={[
                          styles.stepTitleText,
                          { color: colors.text },
                          isActive ? styles.stepTitleActive : (isCompleted ? styles.stepTitleCompleted : [styles.stepTitlePending, { color: colors.textSecondary }]),
                        ]}
                      >
                        {step.title}
                      </Text>
                      <Text style={[styles.stepDescText, { color: colors.textSecondary }]}>{step.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Customer Note */}
        {order.customer_note ? (
          <View style={[styles.customerNoteCard, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE' }]}>
            <Text style={styles.customerNoteTitle}>YOUR NOTE</Text>
            <Text style={[styles.customerNoteBody, { color: colors.text }]}>{order.customer_note}</Text>
          </View>
        ) : null}

        {/* Store Reply Note */}
        {order.owner_note ? (
          <View style={[styles.ownerNoteCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0' }]}>
            <Text style={styles.ownerNoteTitle}>STORE REPLY</Text>
            <Text style={[styles.ownerNoteBody, { color: colors.text }]}>{order.owner_note}</Text>
          </View>
        ) : null}

        {/* Order Items List */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Order Items</Text>
          {(order.items || []).map((item: any) => {
            const isItemRejected = item.status === 'REJECTED';
            const itemName = item.product_name_snapshot || item.product_name || 'Item';
            const itemUnit = item.unit_snapshot;
            const subtotalVal = item.subtotal || item.price_snapshot || '0';

            return (
              <View key={item.id} style={styles.orderItemRow}>
                <View style={styles.orderItemLeft}>
                  <View style={styles.orderItemNameWrapper}>
                    <Text 
                      style={[
                        styles.orderItemName,
                        { color: colors.text },
                        isItemRejected && styles.orderItemStrikethrough,
                      ]}
                    >
                      {item.quantity} x {itemName}
                    </Text>
                    {isItemRejected && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableBadgeText}>Unavailable</Text>
                      </View>
                    )}
                  </View>
                  {itemUnit ? (
                    <Text style={[styles.orderItemUnit, { color: colors.textSecondary }, isItemRejected && styles.orderItemStrikethroughMuted]}>
                      {itemUnit}
                    </Text>
                  ) : null}
                </View>
                <Text 
                  style={[
                    styles.orderItemPrice,
                    { color: colors.text },
                    isItemRejected && styles.orderItemStrikethrough,
                  ]}
                >
                  {isItemRejected ? '₹0.00' : `₹${parseFloat(subtotalVal).toFixed(2)}`}
                </Text>
              </View>
            );
          })}

          {/* Full Billing Breakdown matching Web cart.jsx OrderDetailPage 1:1 */}
          <View style={[styles.billingSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.billingSectionTitle, { color: colors.text }]}>Billing Summary</Text>
            
            <View style={styles.billLine}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.billVal, { color: colors.text }]}>₹{activeSubtotal.toFixed(2)}</Text>
            </View>

            {parseFloat(order.discount_applied || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: '#818CF8' }]}>Product Savings</Text>
                <Text style={[styles.billVal, { color: '#818CF8', fontWeight: 'bold' }]}>
                  - ₹{parseFloat(order.discount_applied).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(order.promo_discount || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.primary, fontWeight: 'bold' }]}>Promo Discount</Text>
                <Text style={[styles.billVal, { color: colors.primary, fontWeight: 'bold' }]}>
                  - ₹{parseFloat(order.promo_discount).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(order.packaging_fee || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Packaging Fee</Text>
                <Text style={[styles.billVal, { color: colors.text }]}>₹{parseFloat(order.packaging_fee).toFixed(2)}</Text>
              </View>
            )}

            {isDelivery && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
                <Text style={[styles.billVal, { color: colors.text }, parseFloat(order.delivery_fee || '0') === 0 && { color: colors.primary, fontWeight: 'bold' }]}>
                  {parseFloat(order.delivery_fee || '0') > 0 
                    ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` 
                    : 'FREE'}
                </Text>
              </View>
            )}

            {parseFloat(order.wallet_discount || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.primary, fontWeight: 'bold' }]}>Wallet Applied</Text>
                <Text style={[styles.billVal, { color: colors.primary, fontWeight: 'bold' }]}>
                  - ₹{parseFloat(order.wallet_discount).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.billLine}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Payment Method</Text>
              <Text style={[styles.billVal, { color: colors.text, fontWeight: '700' }]}>
                {parseFloat(order.total_amount || '0') === 0 
                  ? 'Wallet Full' 
                  : (parseFloat(order.wallet_discount || '0') > 0 
                      ? 'Hybrid (Wallet + Cash)' 
                      : (isDelivery ? 'Cash on Delivery' : 'Cash at Store'))}
              </Text>
            </View>

            <View style={[styles.billDivider, { backgroundColor: colors.border }]} />

            <View style={styles.totalRow}>
              <Text style={[styles.totalRowLabel, { color: colors.text }]}>
                {order.status === 'COMPLETED' ? 'Total Amount Paid' : 'Total Due'}
              </Text>
              <Text style={[styles.totalRowVal, { color: colors.text }]}>
                ₹{parseFloat(order.total_amount || '0').toFixed(2)}
              </Text>
            </View>

            {order.status === 'COMPLETED' && (
              <TouchableOpacity 
                style={[styles.viewInvoiceBottomBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('InvoiceScreen', { orderId: order.id })}
                activeOpacity={0.85}
              >
                <Feather name="file-text" size={18} color="#FFFFFF" />
                <Text style={styles.viewInvoiceBottomBtnText}>View Invoice</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Delivery / Pickup Address Details */}
        <View style={[styles.deliveryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {isDelivery ? (
            <>
              <Feather name="truck" size={24} color={colors.textSecondary} style={styles.deliveryCardIcon} />
              <Text style={[styles.deliveryCardLabel, { color: colors.textSecondary }]}>Delivery to:</Text>
              <Text style={[styles.deliveryCardAddress, { color: colors.text }]}>{order.delivery_address || 'Address not specified'}</Text>
              {order.delivery_pincode ? (
                <Text style={[styles.deliveryCardPincode, { color: colors.textSecondary }]}>Pincode: {order.delivery_pincode}</Text>
              ) : null}
            </>
          ) : (
            <>
              <Feather name="shopping-bag" size={24} color={colors.textSecondary} style={styles.deliveryCardIcon} />
              <Text style={[styles.deliveryCardLabel, { color: colors.textSecondary }]}>
                Pickup: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{order.pickup_time || 'As soon as possible'}</Text>
              </Text>
              <Text style={[styles.deliveryCardSub, { color: colors.textSecondary }]}>Pay at store</Text>
            </>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  errorText: {
    marginTop: 12,
    fontSize: 15,
    color: '#E11D48',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  orderHeaderSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  orderStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  orderConfirmedBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  orderIdText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  viewInvoiceHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A', // slate-900 matching web
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewInvoiceHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 18,
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    padding: 16,
    borderRadius: 12,
  },
  rejectedBannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#BE123C',
  },
  rejectedBannerSubtitle: {
    fontSize: 13,
    color: '#9F1239',
    marginTop: 2,
    lineHeight: 18,
  },
  timelineWrapper: {
    paddingLeft: 4,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 56,
  },
  timelineStepDimmed: {
    opacity: 0.45,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    marginRight: 14,
  },
  stepBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 2,
  },
  stepBadgeCompleted: {
    backgroundColor: '#059669',
  },
  stepBadgePending: {
    backgroundColor: '#E2E8F0',
  },
  stepBadgeActive: {
    backgroundColor: '#059669',
    borderColor: '#D1FAE5',
    borderWidth: 4,
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#F1F5F9',
    minHeight: 24,
    marginVertical: 2,
  },
  stepConnectorLineCompleted: {
    backgroundColor: '#059669',
  },
  stepDetailsCol: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 16,
  },
  stepTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepTitleActive: {
    color: '#047857',
    fontWeight: '800',
  },
  stepTitleCompleted: {
    color: '#0F172A',
  },
  stepTitlePending: {
    color: '#64748B',
  },
  stepDescText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  customerNoteCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  customerNoteTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  customerNoteBody: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },
  ownerNoteCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  ownerNoteTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  ownerNoteBody: {
    fontSize: 14,
    color: '#064E3B',
    lineHeight: 20,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  orderItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  orderItemNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  orderItemUnit: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderItemStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  orderItemStrikethroughMuted: {
    color: '#CBD5E1',
  },
  unavailableBadge: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  unavailableBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
    textTransform: 'uppercase',
  },
  billingSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  billingSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  billLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  billVal: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  totalRowLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  totalRowVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#059669',
  },
  viewInvoiceBottomBtn: {
    marginTop: 18,
    backgroundColor: '#0F172A', // slate-900 matching web
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  viewInvoiceBottomBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  deliveryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 16,
  },
  deliveryCardIcon: {
    marginBottom: 8,
  },
  deliveryCardLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  deliveryCardAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 2,
  },
  deliveryCardPincode: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  deliveryCardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});




