import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { storeApi, StoreSettings } from '../../api/store';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getCachedOrderByIdSync, saveCachedSingleOrder } from '../../services/ordersCache';
import { OrderTrackingMap } from '../../components/OrderTrackingMap';

export function OrderTrackingScreen({ navigation, route }: { navigation: AppNavigationProp; route: any }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { orderId, initialOrder } = route?.params || {};
  const cachedOrder = initialOrder || (orderId ? getCachedOrderByIdSync(orderId) : null);
  const [order, setOrder] = useState<any>(cachedOrder);
  const orderRef = useRef(order);
  orderRef.current = order;
  const [loading, setLoading] = useState(!cachedOrder);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  useEffect(() => {
    storeApi.getSettings().then(setStoreSettings).catch(() => null);
  }, []);

  const handleOpenWhatsApp = () => {
    const rawNumber = storeSettings?.whatsapp_number || '+919876543210';
    const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
    const template = storeSettings?.whatsapp_order_help_template || 'Hi Narendra Kirana, I need help with Order #{order_id}';
    const msg = template.replace('{order_id}', String(order?.id || orderId));
    const url = `whatsapp://send?phone=${cleanNumber}&text=${encodeURIComponent(msg)}`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`);
      }
    }).catch(() => {
      Linking.openURL(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(msg)}`);
    });
  };

  const fetchOrderDetails = useCallback(async (isPullRefresh = false) => {
    if (!user) {
      setLoading(false);
      if (isPullRefresh) setRefreshing(false);
      return;
    }
    if (isPullRefresh) {
      setRefreshing(true);
    }
    try {
      const res = await apiClient.get(`/orders/${orderId}/`, { params: { t: Date.now() } });
      setOrder(res.data);
      saveCachedSingleOrder(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching order details:', err);
      if (!orderRef.current) {
        setError('Could not load this order.');
      }
    } finally {
      setLoading(false);
      if (isPullRefresh) setRefreshing(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

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
  }, [orderId, user, fetchOrderDetails]);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="truck" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to Track Order</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Please sign in to view live delivery status, rider location, and order timeline updates.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
  const normalizeStatus = (st?: string): string => {
    if (!st) return 'NEW';
    const s = st.toUpperCase();
    if (s === 'CONFIRMED') return 'ACCEPTED';
    if (s === 'PROCESSING') return 'PREPARING';
    if (s === 'OUT_FOR_DELIVERY') return 'READY';
    if (s === 'DELIVERED') return 'COMPLETED';
    if (s === 'CANCELLED') return 'REJECTED';
    return s;
  };
  const normalizedStatus = normalizeStatus(order?.status);
  const currentIndex = statusOrder.indexOf(normalizedStatus);

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

        {/* Delivery OTP Card */}
        {order.order_type === 'DELIVERY' && order.delivery_otp && order.status !== 'COMPLETED' && (
          <View style={[styles.otpCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0' }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Feather name="shield" size={15} color={colors.primary} />
                <Text style={[styles.otpCardLabel, { color: colors.primary }]}>DELIVERY VERIFICATION OTP</Text>
              </View>
              <Text style={[styles.otpCardSubtitle, { color: colors.textSecondary }]}>
                Share this 4-digit OTP with your delivery partner upon arrival:
              </Text>
              {order.delivery_partner_name ? (
                <Text style={[styles.otpCardRiderText, { color: colors.text }]}>
                  🛵 Rider: {order.delivery_partner_name}
                </Text>
              ) : null}
            </View>
            <View style={[styles.otpBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.otpCodeText, { color: colors.primary }]}>{order.delivery_otp}</Text>
            </View>
          </View>
        )}

        {/* Delivery Partner Live Address & Contact Card */}
        {order.order_type === 'DELIVERY' && (order.delivery_partner_name || order.delivery_partner_lat || order.status === 'READY' || order.status === 'OUT_FOR_DELIVERY') && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.riderHeaderRow}>
              <View style={[styles.riderAvatar, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : '#EEF2FF' }]}>
                <Text style={styles.riderAvatarEmoji}>🛵</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.riderName, { color: colors.text }]}>
                  {order.delivery_partner_name || 'Delivery Partner Assigned'}
                </Text>
                {order.delivery_partner_vehicle ? (
                  <Text style={[styles.riderVehicleText, { color: colors.textSecondary }]}>
                    {order.delivery_partner_vehicle}
                  </Text>
                ) : (
                  <Text style={[styles.riderVehicleText, { color: colors.textSecondary }]}>
                    Delivery Partner
                  </Text>
                )}
              </View>

              {/* Call Rider Button */}
              {order.delivery_partner_phone ? (
                <TouchableOpacity
                  style={[styles.callRiderBtn, { backgroundColor: colors.primary }]}
                  onPress={() => Linking.openURL(`tel:${order.delivery_partner_phone}`)}
                  activeOpacity={0.8}
                >
                  <Feather name="phone-call" size={14} color="#FFFFFF" />
                  <Text style={styles.callRiderBtnText}>Call</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Live Status Row */}
            <View style={[styles.riderStatusBanner, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4', borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#BBF7D0' }]}>
              <View style={styles.livePulseDot} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveStatusTitle, { color: colors.primary }]}>
                  {order.delivery_partner_lat ? 'Live GPS Active' : (order.status === 'OUT_FOR_DELIVERY' ? 'Rider On The Way' : 'Order Assigned to Rider')}
                </Text>
                <Text style={[styles.liveStatusSubtitle, { color: colors.textSecondary }]}>
                  {order.delivery_partner_lat 
                    ? 'Real-time GPS coordinates synced from rider' 
                    : (order.status === 'OUT_FOR_DELIVERY' ? 'En route to your delivery address' : 'Getting order ready for dispatch')}
                </Text>
              </View>
            </View>

            {/* Live Address Details (Destination Doorstep) */}
            <View style={[styles.doorstepAddressBox, { borderTopColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Feather name="map-pin" size={16} color="#E11D48" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.doorstepLabel, { color: colors.textSecondary }]}>
                    DELIVERING TO YOUR DOORSTEP
                  </Text>
                  <Text style={[styles.doorstepAddressText, { color: colors.text }]}>
                    {order.delivery_address || 'Address not specified'}
                  </Text>
                  {order.delivery_pincode ? (
                    <Text style={[styles.doorstepPincodeText, { color: colors.primary }]}>
                      Pincode: {order.delivery_pincode}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Live Route / Store Location Map */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Feather name={isDelivery ? "navigation" : "map-pin"} size={15} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>
                  {isDelivery ? "Live Route Tracking" : "Store Pickup Location"}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                {isDelivery 
                  ? "Interactive live road navigation to your doorstep" 
                  : "Narendra Kirana Store location & pickup directions"}
              </Text>
            </View>
          </View>
          <OrderTrackingMap order={order} storeSettings={storeSettings} height={230} />
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
                  {isItemRejected ? '₹0.00' : `₹${(parseFloat(subtotalVal || '0') || 0).toFixed(2)}`}
                </Text>
              </View>
            );
          })}

          {/* Full Billing Breakdown matching Web cart.jsx OrderDetailPage 1:1 */}
          <View style={[styles.billingSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.billingSectionTitle, { color: colors.text }]}>Billing Summary</Text>
            
            <View style={styles.billLine}>
              <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.billVal, { color: colors.text }]}>₹{(activeSubtotal || 0).toFixed(2)}</Text>
            </View>

            {parseFloat(order.discount_applied || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: '#818CF8' }]}>Product Savings</Text>
                <Text style={[styles.billVal, { color: '#818CF8', fontWeight: 'bold' }]}>
                  - ₹{(parseFloat(order.discount_applied || '0') || 0).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(order.promo_discount || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.primary, fontWeight: 'bold' }]}>Promo Discount</Text>
                <Text style={[styles.billVal, { color: colors.primary, fontWeight: 'bold' }]}>
                  - ₹{(parseFloat(order.promo_discount || '0') || 0).toFixed(2)}
                </Text>
              </View>
            )}

            {parseFloat(order.packaging_fee || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Packaging Fee</Text>
                <Text style={[styles.billVal, { color: colors.text }]}>₹{(parseFloat(order.packaging_fee || '0') || 0).toFixed(2)}</Text>
              </View>
            )}

            {isDelivery && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
                <Text style={[styles.billVal, { color: colors.text }, parseFloat(order.delivery_fee || '0') === 0 && { color: colors.primary, fontWeight: 'bold' }]}>
                  {parseFloat(order.delivery_fee || '0') > 0 
                    ? `₹${(parseFloat(order.delivery_fee || '0') || 0).toFixed(2)}` 
                    : 'FREE'}
                </Text>
              </View>
            )}

            {parseFloat(order.wallet_discount || '0') > 0 && (
              <View style={styles.billLine}>
                <Text style={[styles.billLabel, { color: colors.primary, fontWeight: 'bold' }]}>Wallet Applied</Text>
                <Text style={[styles.billVal, { color: colors.primary, fontWeight: 'bold' }]}>
                  - ₹{(parseFloat(order.wallet_discount || '0') || 0).toFixed(2)}
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
                ₹{(parseFloat(order.total_amount || '0') || 0).toFixed(2)}
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

        {/* Need Help? WhatsApp Support Quick-Connect */}
        {storeSettings?.enable_whatsapp_support !== false && (
          <TouchableOpacity 
            style={styles.whatsappHelpBtn}
            onPress={handleOpenWhatsApp}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            <Text style={styles.whatsappHelpBtnText}>Need Help with this Order? Chat on WhatsApp</Text>
          </TouchableOpacity>
        )}

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
  guestStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  guestIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  whatsappHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#25D366',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 20,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappHelpBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  otpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12,
  },
  otpCardLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  otpCardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  otpCardRiderText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  otpBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  otpCodeText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  riderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderAvatarEmoji: {
    fontSize: 22,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '800',
  },
  riderVehicleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  callRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
  },
  callRiderBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  riderStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  liveStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  liveStatusSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  doorstepAddressBox: {
    paddingTop: 12,
    borderTopWidth: 1,
  },
  doorstepLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  doorstepAddressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  doorstepPincodeText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default OrderTrackingScreen;




