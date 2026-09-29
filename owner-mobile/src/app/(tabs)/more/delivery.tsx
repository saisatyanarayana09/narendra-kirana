import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Platform,
} from 'react-native';
import api, { getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../../utils/alerts';

interface Driver {
  id: number;
  name: string;
  phone: string;
  is_online?: boolean;
  active_orders_count?: number;
}

interface DriverCardProps {
  item: Driver;
  onCall: (phone: string) => void;
  onWhatsapp: (phone: string) => void;
}

const DriverCard = memo(({ item, onCall, onWhatsapp }: DriverCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item?.name || 'Unnamed Driver'}</Text>
        <Text style={styles.phone}>{item?.phone || 'No phone'}</Text>
        {item?.active_orders_count != null ? (
          <Text style={styles.meta}>Active Deliveries: {item.active_orders_count}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
          onPress={() => onCall(item?.phone)}
        >
          <Ionicons name="call" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
          onPress={() => onWhatsapp(item?.phone)}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function DeliveryPartnersScreen() {
  const [partners, setPartners] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPartners = useCallback(async () => {
    try {
      const response = await api.get('/delivery/partners/');
      const raw = response?.data?.results ?? response?.data;
      setPartners(Array.isArray(raw) ? raw : []);
    } catch (e: any) {
      if (e?.response?.status !== 401) {
        showAlert('Error', getErrorMessage(e, 'Failed to fetch delivery partners'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPartners();
  }, [fetchPartners]);

  const contactDriver = useCallback(async (phone: string) => {
    if (!phone) {
      showAlert('Unavailable', 'No phone number listed for this partner.');
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      showAlert('Phone Number', `Call partner at: ${phone}`);
    }
  }, []);

  const whatsappDriver = useCallback(async (phone: string) => {
    if (!phone) {
      showAlert('Unavailable', 'No phone number listed for this partner.');
      return;
    }
    const digits = String(phone).replace(/\D/g, '');
    const url =
      Platform.OS === 'web'
        ? `https://wa.me/${digits}`
        : `whatsapp://send?phone=${digits}`;
    try {
      await Linking.openURL(url);
    } catch {
      try {
        await Linking.openURL(`https://wa.me/${digits}`);
      } catch {
        showAlert('WhatsApp', `Message partner at: ${phone}`);
      }
    }
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Driver }) => (
      <DriverCard item={item} onCall={contactDriver} onWhatsapp={whatsappDriver} />
    ),
    [contactDriver, whatsappDriver]
  );

  const keyExtractor = useCallback(
    (item: Driver, index: number) => (item?.id != null ? String(item.id) : `driver-${index}`),
    []
  );

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={partners}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={false}
          ListEmptyComponent={<Text style={styles.empty}>No delivery partners found.</Text>}
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
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  info: {
    flex: 1,
  },
  name: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  phone: {
    color: '#94a3b8',
    fontSize: 14,
  },
  meta: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 12,
    borderRadius: 8,
  },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 40,
  },
});
