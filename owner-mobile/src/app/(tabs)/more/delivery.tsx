import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
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
  ScrollView,
} from 'react-native';
import api, { getErrorMessage } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../context/ThemeContext';
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

const VEHICLE_TYPES = ['Bike', 'Scooter', 'Cycle', 'Car'];

const DriverCard = memo(
  ({
    item,
    onCall,
    onWhatsapp,
    colors,
  }: {
    item: Driver;
    onCall: (phone: string) => void;
    onWhatsapp: (phone: string) => void;
    colors: any;
  }) => {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]}>
              {item?.name || item?.username || 'Unnamed Driver'}
            </Text>
            <View
              style={[
                styles.onlinePill,
                { backgroundColor: item?.is_online ? '#059669' : '#475569' },
              ]}
            >
              <Text style={styles.onlineText}>{item?.is_online ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
          </View>
          <Text style={[styles.phone, { color: colors.textMuted }]}>
            {item?.phone || 'No phone'}
            {item?.vehicle_type ? ` • ${item.vehicle_type}` : ''}
            {item?.vehicle_number ? ` (${item.vehicle_number})` : ''}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            Active: <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{item?.active_orders_count ?? 0}</Text> •
            Completed: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{item?.total_deliveries ?? 0}</Text>
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}
            onPress={() => onCall(item?.phone)}
          >
            <Ionicons name="call" size={17} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10b981' }]}
            onPress={() => onWhatsapp(item?.phone)}
          >
            <Ionicons name="logo-whatsapp" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

export default function DeliveryPartnersScreen() {
  const { colors, isDark } = useAppTheme();

  const [partners, setPartners] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // New Rider Form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Bike');
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
        last_name: lastName.trim(),
        username: username.trim(),
        password: password.trim(),
        phone_number: phoneNumber.trim() || username.trim(),
        vehicle_type: vehicleType,
        vehicle_number: vehicleNumber.trim(),
      });
      setFirstName('');
      setLastName('');
      setUsername('');
      setPassword('');
      setPhoneNumber('');
      setVehicleNumber('');
      setVehicleType('Bike');
      setShowAddForm(false);
      fetchPartners();
      showAlert('Success', 'Delivery partner account created successfully! 🛵');
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

  const filteredPartners = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter((p) => {
      const name = (p.name || '').toLowerCase();
      const user = (p.username || '').toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      return name.includes(q) || user.includes(q) || phone.includes(q);
    });
  }, [partners, searchTerm]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.topTitle, { color: colors.text }]}>
            Delivery Fleet ({partners.length})
          </Text>
          <Text style={[styles.topSub, { color: colors.textMuted }]}>
            Manage drivers & vehicle assignments
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addToggleBtn, { backgroundColor: showAddForm ? colors.cardAlt : '#10b981' }]}
          onPress={() => setShowAddForm((prev) => !prev)}
        >
          <Ionicons
            name={showAddForm ? 'close' : 'person-add-outline'}
            size={16}
            color={showAddForm ? colors.text : '#fff'}
          />
          <Text
            style={[
              styles.addToggleText,
              { color: showAddForm ? colors.text : '#fff' },
            ]}
          >
            {showAddForm ? 'Close' : 'Add Rider'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Rider Form Collapsible Card */}
      {showAddForm && (
        <ScrollView style={[styles.addFormCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formHeading, { color: colors.text }]}>Register New Delivery Rider</Text>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>First Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="Ramesh"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Last Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="Kumar"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Username *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="ramesh_delivery"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Login Password *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="Secret123"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Phone Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Vehicle Number</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.cardAlt, borderColor: colors.border, color: colors.text }]}
                placeholder="TS 09 AB 1234"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                value={vehicleNumber}
                onChangeText={setVehicleNumber}
              />
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Vehicle Type</Text>
          <View style={styles.vehicleTypeRow}>
            {VEHICLE_TYPES.map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.vehicleChip,
                  {
                    borderColor: vehicleType === v ? '#10b981' : colors.border,
                    backgroundColor: vehicleType === v ? (isDark ? '#064e3b' : '#ecfdf5') : colors.cardAlt,
                  },
                ]}
                onPress={() => setVehicleType(v)}
              >
                <Text
                  style={[
                    styles.vehicleChipText,
                    {
                      color: vehicleType === v ? '#10b981' : colors.textMuted,
                      fontWeight: vehicleType === v ? '700' : '500',
                    },
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.createBtn, { opacity: creating ? 0.7 : 1 }]}
            onPress={handleCreatePartner}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create Driver Account</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search riders by name or phone..."
          placeholderTextColor={colors.textMuted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Driver List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredPartners}
          keyExtractor={(item, index) => (item?.id != null ? String(item.id) : `driver-${index}`)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
            />
          }
          renderItem={({ item }) => (
            <DriverCard
              item={item}
              onCall={contactDriver}
              onWhatsapp={whatsappDriver}
              colors={colors}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No delivery partners found.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  topTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  topSub: {
    fontSize: 12,
    marginTop: 2,
  },
  addToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addFormCard: {
    maxHeight: 340,
    padding: 16,
    borderBottomWidth: 1,
  },
  formHeading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  vehicleChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  vehicleChipText: {
    fontSize: 12,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  listContent: {
    padding: 14,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  info: {
    flex: 1,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 15,
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
    fontWeight: '800',
  },
  phone: {
    fontSize: 12,
    marginTop: 3,
  },
  meta: {
    fontSize: 11,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 13,
  },
});
