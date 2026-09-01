import { AppNavigationProp } from '../../navigation/types';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { theme } from '../../constants/theme';
import { apiClient } from '../../api/client';

export function OrderTrackingScreen({ navigation, route }: { navigation: AppNavigationProp, route: any }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchOrderDetails = async () => {
      try {
        const res = await apiClient.get(`/orders/${orderId}/`);
        if (isMounted) {
          setOrder(res.data);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchOrderDetails();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      fetchOrderDetails();
    }, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
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
        <Text>Order not found</Text>
      </View>
    );
  }

  // Determine progress based on status
  // Timeline: NEW -> ACCEPTED -> READY -> COMPLETED
  // (REJECTED is a separate failure track)
  
  const stages = [
    { id: 'NEW', title: 'Order Placed', subtitle: 'We have received your order' },
    { id: 'ACCEPTED', title: 'Order Accepted', subtitle: 'Store has confirmed your order' },
    { id: 'READY', title: order.order_type === 'DELIVERY' ? 'Out for Delivery' : 'Ready for Pickup', subtitle: order.order_type === 'DELIVERY' ? 'Rider is on the way' : 'Your order is packed and ready' },
    { id: 'COMPLETED', title: 'Delivered', subtitle: 'Enjoy your groceries!' },
  ];
  
  const getStageIndex = (status: string) => {
    switch(status) {
      case 'NEW': return 0;
      case 'ACCEPTED': return 1;
      case 'READY': return 2;
      case 'COMPLETED': return 3;
      default: return -1;
    }
  };

  const currentIndex = getStageIndex(order.status);
  const isRejected = order.status === 'REJECTED';

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
                const isCurrent = index === currentIndex;
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
                        <View style={[styles.timelineLine, isCompleted && styles.timelineLineActive]} />
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

        {/* Order Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.iconBox}>
              {order.order_type === 'DELIVERY' ? (
                <Feather name="map-pin" size={20} color={theme.colors.primary} />
              ) : (
                <Feather name="shopping-bag" size={20} color={theme.colors.primary} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>{order.order_type === 'DELIVERY' ? 'Delivery Address' : 'Pickup From'}</Text>
              <Text style={styles.detailValue}>
                {order.order_type === 'DELIVERY' ? order.delivery_address : 'Main Road, Kirana Market'}
              </Text>
            </View>
          </View>
          
          {order.order_type === 'PICKUP' && order.pickup_time && (
            <View style={styles.detailRow}>
              <View style={styles.iconBox}>
                <Feather name="clock" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailLabel}>Expected Pickup Time</Text>
                <Text style={styles.detailValue}>{order.pickup_time}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemQuantity}>{item.quantity} x</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
              <Text style={styles.itemPrice}>₹{item.price_at_order}</Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{order.total_amount}</Text>
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
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.error + '50',
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.error,
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
  itemRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  itemQuantity: {
    width: 32,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    width: 60,
    textAlign: 'right',
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
  },
  billLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  billValue: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
  },
});


