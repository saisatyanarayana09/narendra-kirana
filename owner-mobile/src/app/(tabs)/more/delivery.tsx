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
  TextInput,
} from 'react-native';
import api, { getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { showAlert } from '../../../utils/alerts';

interface Driver {
  id: number;
  name: string;
  username?: string;
  phone: string;
  vehicle_type?: string;
  vehicle_number?: string;
  is_online?: boolean;
  total_deliveries?: number;
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
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item?.name || item?.username || 'Unnamed Driver'}</Text>
          <View
            style={[
              styles.onlinePill,
              { backgroundColor: item?.is_online ? '#059669' : '#475569' },
            ]}
          >
            <Text style={styles.onlineText}>{item?.is_online ? 'ONLINE' : 'OFFLINE'}</Text>
          </View>
        </View>
        <Text style={styles.phone}>
          {item?.phone || 'No phone'}
          {item?.vehicle_type ? ` • ${item.vehicle_type}` : ''}
          {item?.vehicle_number ? ` (${item.vehicle_number})` : ''}
        </Text>
        <Text style={styles.meta}>
          Active Orders: {item?.active_orders_count ?? 0} • Completed: {item?.total_deliveries ?? 0}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
          onPress={() => onCall(item?.phone)}
        >
          <Ionicons name="call" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
          onPress={() => onWhatsapp(item?.phone)}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function DeliveryPartnersScreen() {
  const [partners, setPartners] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Rider Form
  const [firstName, setFirstName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [creating, setCreating] = useState(false);

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

  const handleCreatePartner = async () => {
    if (!username.trim() || !password.trim()) {
      showAlert('Validation', 'Username and password are required for the rider login.');
      return;
    }
    setCreating(true);
    try {
      await api.post('/delivery/partners/', {
        first_name: firstName.trim(),
        username: username.trim(),
        password: password.trim(),
        phone_number: phoneNumber.trim() || username.trim(),
        vehicle_type: 'Bike',
        vehicle_number: vehicleNumber.trim(),
      });
      setFirstName('');
      setUsername('');
      setPassword('');
      setPhoneNumber('');
      setVehicleNumber('');
      setShowAddForm(false);
      fetchPartners();
      showAlert('Success', 'Delivery partner account created!');
    } catch (e: any) {
      showAlert('Error', getErrorMessage(e, 'Failed to create delivery partner.'));
    } finally {
      setCreating(false);
    }
  };

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
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Registered Riders ({partners.length})</Text>
        <TouchableOpacity
          style={styles.addToggleBtn}
          onPress={() => setShowAddForm((prev) => !prev)}
        >
          <Ionicons name={showAddForm ? 'close' : 'person-add-outline'} size={16} color="#fff" />
          <Text style={styles.addToggleText}>{showAddForm ? 'Close' : 'Add Rider'}</Text>
        </TouchableOpacity>
      </View>

      {showAddForm ? (
        <View style={styles.formCard}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Full Name"
              placeholderTextColor="#64748b"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Phone Number"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Login Username *"
              placeholderTextColor="#64748b"
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Password *"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          <TextInput
            style={[styles.input, { marginBottom: 10 }]}
            placeholder="Vehicle Number (e.g. TS09AB1234)"
            placeholderTextColor="#64748b"
            autoCapitalize="characters"
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
          />
          <TouchableOpacity
            style={styles.createBtn}
            onPress={handleCreatePartner}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createBtnText}>Create Rider Account</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={partners}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
          }
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
  topBar: {
    backgroundColor: '#1e293b',
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addToggleText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: '#1e293b',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
    color: '#f8fafc',
  },
  createBtn: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnText: {
    color: '#fff',
    fontWeight: 'bold',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: 'bold',
  },
  onlinePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  onlineText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  phone: {
    color: '#94a3b8',
    fontSize: 13,
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
