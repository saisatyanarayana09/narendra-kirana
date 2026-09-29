import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { ApiInstance, getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../../utils/alerts';

interface OrderItem {
  id: number;
  product_name_snapshot: string;
  price_snapshot: string;
  quantity: number;
  subtotal: string;
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  order_type: string;
  status: string;
  total_amount: string;
  items: OrderItem[];
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get(`/orders/${id}/`);
      setOrder(response.data);
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(error, 'Could not load order details'), () => router.back());
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const updateStatus = useCallback(
    async (newStatus: string) => {
      if (!id) return;
      try {
        setLoading(true);
        await api.patch(`/orders/${id}/status/`, { status: newStatus });
        (api as ApiInstance).clearCache();
        await fetchOrderDetails();
        showAlert('Success', `Order marked as ${newStatus}`);
      } catch (error: any) {
        showAlert('Error', getErrorMessage(error, 'Failed to update order status'));
        setLoading(false);
      }
    },
    [id, fetchOrderDetails]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (!order) return null;

  const itemsList = Array.isArray(order.items) ? order.items : [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.orderId}>Order #{order.id}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{order.status}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Customer Details</Text>
        <Text style={styles.text}>
          <Ionicons name="person" size={16} /> {order.customer_name || 'Guest'}
        </Text>
        <Text style={styles.text}>
          <Ionicons name="call" size={16} /> {order.customer_phone || 'N/A'}
        </Text>
        <Text style={styles.text}>
          <Ionicons name="location" size={16} />{' '}
          {order.order_type === 'PICKUP' ? 'Store Pickup' : order.delivery_address || 'No address provided'}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items ({itemsList.length})</Text>
        {itemsList.map((item, index) => (
          <View key={item?.id ? String(item.id) : `item-${index}`} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {item?.quantity ?? 1}x {item?.product_name_snapshot || 'Item'}
            </Text>
            <Text style={styles.itemPrice}>₹{item?.price_snapshot ?? '0.00'}</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalText}>Total Amount</Text>
          <Text style={styles.totalAmount}>₹{order.total_amount ?? '0.00'}</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        {order.status === 'NEW' && (
          <>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#10b981' }]}
              onPress={() => updateStatus('ACCEPTED')}
            >
              <Text style={styles.buttonText}>Accept Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#ef4444' }]}
              onPress={() => updateStatus('REJECTED')}
            >
              <Text style={styles.buttonText}>Reject Order</Text>
            </TouchableOpacity>
          </>
        )}

        {['ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#3b82f6' }]}
            onPress={() => updateStatus('OUT_FOR_DELIVERY')}
          >
            <Text style={styles.buttonText}>Mark Out for Delivery</Text>
          </TouchableOpacity>
        )}

        {order.status === 'OUT_FOR_DELIVERY' && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#10b981' }]}
            onPress={() => updateStatus('COMPLETED')}
          >
            <Text style={styles.buttonText}>Mark Completed</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    marginBottom: 16,
  },
  orderId: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  text: {
    color: '#cbd5e1',
    fontSize: 16,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  itemName: {
    color: '#cbd5e1',
    fontSize: 16,
    flex: 1,
  },
  itemPrice: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
  },
  totalText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  actionContainer: {
    padding: 16,
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
