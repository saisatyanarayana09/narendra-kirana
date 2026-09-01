import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function OrderTrackingScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchOrderDetails = async () => {
      try {
        const res = await apiClient.get(`/orders/${orderId}/`);
        if (isMounted) {
          setOrder(res.data);
          if (res.data.status === 'COMPLETED' || res.data.status === 'REJECTED') {
            if (interval) {
              clearInterval(interval);
              interval = null;
            }
          }
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrderDetails();
    
    // Poll for updates every 5 seconds until completed or rejected
    interval = setInterval(() => {
      fetchOrderDetails();
    }, 5000);
    
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [orderId]);

  if (loading && !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Order not found</Text>
      </View>
    );
  }

  // 5-Stage Timeline: NEW -> ACCEPTED -> PREPARING -> READY -> COMPLETED
  // (REJECTED is a separate failure track)
  const isDelivery = order.order_type === 'DELIVERY';
  
  const stages = [
    { id: 'NEW', title: 'Order Placed', subtitle: 'We have received your order' },
    { id: 'ACCEPTED', title: 'Order Accepted', subtitle: 'Store has confirmed your order' },
    { id: 'PREPARING', title: 'Preparing Order', subtitle: 'Store is packing your items' },
    { 
      id: 'READY', 
      title: isDelivery ? 'Out for Delivery' : 'Ready for Pickup', 
      subtitle: isDelivery ? 'Rider is on the way' : 'Your order is packed and ready' 
    },
    { 
      id: 'COMPLETED', 
      title: isDelivery ? 'Delivered' : 'Picked Up', 
      subtitle: isDelivery ? 'Enjoy your groceries!' : 'Order handed over successfully' 
    },
  ];
  
  const getStageIndex = (status: string) => {
    switch(status) {
      case 'NEW': return 0;
      case 'ACCEPTED': return 1;
      case 'PREPARING': return 2;
      case 'READY': return 3;
      case 'COMPLETED': return 4;
      default: return -1;
    }
  };

  const currentIndex = getStageIndex(order.status);
  const isRejected = order.status === 'REJECTED';

  const activeSubtotal = (order.items || [])
    .filter((i: any) => i.status !== 'REJECTED')
    .reduce((sum: number, item: any) => {
      const itemPrice = parseFloat(item.subtotal || item.price_snapshot || item.price_at_order || '0');
      return sum + itemPrice;
    }, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Status Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          
          {isRejected ? (
            <View style={styles.rejectedBox}>
              <Text style={styles.rejectedTitle}>Order Cancelled</Text>
              <Text style={styles.rejectedSubtitle}>Unfortunately, this order could not be fulfilled.</Text>
            </View>
          ) : (
            <View style={styles.timeline}>
              {stages.map((stage, index) => {
                const isCompleted = index <= currentIndex;
                const isLast = index === stages.length - 1;
                
                return (
                  <View key={stage.id} style={styles.timelineRow}>
                    <View style={styles.timelineIconContainer}>
                      {isCompleted ? (
                        <Feather name="check-circle" size={24} color={theme.colors.primary} />
                      ) : (
                        <Feather name="circle" size={24} color={theme.colors.border} />
                      )}
                      {!isLast && (
                        <View style={[styles.timelineLine, isCompleted && index < currentIndex && styles.timelineLineActive]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, isCompleted && styles.timelineTitleActive]}>
                        {stage.title}
                      </Text>
                      <Text style={styles.timelineSubtitle}>{stage.subtitle}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Delivery / Pickup Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isDelivery ? 'Delivery Details' : 'Pickup Details'}
          </Text>
          
          <View style={styles.detailRow}>
            <View style={styles.iconBox}>
              {isDelivery ? (
                <Feather name="map-pin" size={20} color={theme.colors.primary} />
              ) : (
                <Feather name="shopping-bag" size={20} color={theme.colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>
                {isDelivery ? 'Delivery Address' : 'Pickup From'}
              </Text>
              <Text style={styles.detailValue}>
                {isDelivery ? (order.delivery_address || 'Address not specified') : 'Main Road, Kirana Market'}
              </Text>
              {isDelivery && order.delivery_pincode ? (
                <Text style={styles.pincodeText}>Pincode: {order.delivery_pincode}</Text>
              ) : null}
            </View>
          </View>
          
          {!isDelivery && order.pickup_time ? (
            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Feather name="clock" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Expected Pickup Time</Text>
                <Text style={styles.detailValue}>{order.pickup_time}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Order Notes */}
        {(order.customer_note || order.owner_note) ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            {order.customer_note ? (
              <View style={styles.customerNoteBox}>
                <View style={styles.noteHeader}>
                  <Feather name="message-square" size={14} color="#D97706" />
                  <Text style={styles.customerNoteTitle}>Note from You</Text>
                </View>
                <Text style={styles.noteContent}>{order.customer_note}</Text>
              </View>
            ) : null}
            {order.owner_note ? (
              <View style={[styles.ownerNoteBox, order.customer_note ? { marginTop: 10 } : null]}>
                <View style={styles.noteHeader}>
                  <Feather name="message-circle" size={14} color="#2563EB" />
                  <Text style={styles.ownerNoteTitle}>Note from Store</Text>
                </View>
                <Text style={styles.noteContent}>{order.owner_note}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length || 0})</Text>
          {order.items?.map((item: any) => {
            const isItemRejected = item.status === 'REJECTED';
            const itemName = item.product_name_snapshot || item.product_name || 'Product';
            const itemUnit = item.unit_snapshot;
            const itemSubtotal = item.subtotal || item.price_snapshot || item.price_at_order || '0';

            return (
              <View key={item.id} style={styles.itemRow}>
                <Text style={[styles.itemQuantity, isItemRejected && styles.strikethroughText]}>
                  {item.quantity} x
                </Text>
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={[styles.itemName, isItemRejected && styles.strikethroughText]} numberOfLines={2}>
                      {itemName}
                    </Text>
                    {isItemRejected && (
                      <View style={styles.unavailableTag}>
                        <Text style={styles.unavailableTagText}>Unavailable</Text>
                      </View>
                    )}
                  </View>
                  {itemUnit ? (
                    <Text style={[styles.itemUnit, isItemRejected && styles.strikethroughMuted]}>
                      {itemUnit}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.itemPrice, isItemRejected && styles.strikethroughText]}>
                  {isItemRejected ? '₹0.00' : `₹${parseFloat(itemSubtotal).toFixed(2)}`}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Full Billing Breakdown matching Web App */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>₹{activeSubtotal.toFixed(2)}</Text>
          </View>

          {parseFloat(order.discount_applied || '0') > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.savingsLabel}>Savings</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(order.discount_applied).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(order.promo_discount || '0') > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.savingsLabel}>Promo Discount</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(order.promo_discount).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(order.packaging_fee || '0') > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Packaging Fee</Text>
              <Text style={styles.billValue}>₹{parseFloat(order.packaging_fee).toFixed(2)}</Text>
            </View>
          )}

          {isDelivery && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee</Text>
              <Text style={parseFloat(order.delivery_fee || '0') > 0 ? styles.billValue : styles.freeText}>
                {parseFloat(order.delivery_fee || '0') > 0 ? `₹${parseFloat(order.delivery_fee).toFixed(2)}` : 'FREE'}
              </Text>
            </View>
          )}

          {parseFloat(order.wallet_discount || '0') > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.savingsLabel}>Wallet Applied</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(order.wallet_discount).toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Payment Method</Text>
            <Text style={styles.paymentMethodValue}>
              {parseFloat(order.total_amount || '0') === 0 
                ? 'Wallet Full' 
                : (parseFloat(order.wallet_discount || '0') > 0 
                    ? 'Hybrid (Wallet + Cash)' 
                    : (isDelivery ? 'Cash on Delivery' : 'Cash at Store'))}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {order.status === 'COMPLETED' ? 'Total Paid' : 'Total Amount'}
            </Text>
            <Text style={styles.totalValue}>₹{parseFloat(order.total_amount || '0').toFixed(2)}</Text>
          </View>
        </View>

      </ScrollView>
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
  },
  notFoundText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  timelineCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  timeline: {
    marginLeft: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 60,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  timelineLineActive: {
    backgroundColor: theme.colors.primary,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  timelineTitleActive: {
    color: theme.colors.text,
  },
  timelineSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  rejectedBox: {
    backgroundColor: '#FFF1F2',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#BE123C',
    marginBottom: 4,
  },
  rejectedSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
    lineHeight: 20,
  },
  pincodeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  customerNoteBox: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ownerNoteBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  customerNoteTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  ownerNoteTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1D4ED8',
    textTransform: 'uppercase',
  },
  noteContent: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  itemQuantity: {
    width: 32,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  itemUnit: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  unavailableTag: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  unavailableTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#BE123C',
    textTransform: 'uppercase',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    minWidth: 65,
    textAlign: 'right',
    marginTop: 1,
  },
  strikethroughText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  strikethroughMuted: {
    color: theme.colors.border,
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  billValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  savingsLabel: {
    fontSize: 14,
    color: '#059669',
  },
  savingsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  freeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
  },
  paymentMethodValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
  },
});



