import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';

export function AddressesScreen({ navigation }: { navigation: AppNavigationProp }) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddresses();
    });
    fetchAddresses();
    return unsubscribe;
  }, [navigation]);

  const fetchAddresses = async () => {
    try {
      const res = await apiClient.get('/auth/addresses/');
      setAddresses(Array.isArray(res.data) ? res.data : (res.data?.results || []));
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAddresses();
  }, []);

  const deleteAddress = async (id: number) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to remove this delivery address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/auth/addresses/${id}/`);
              setAddresses(prev => prev.filter(a => a.id !== id));
            } catch (err) {
              Alert.alert('Error', 'Failed to delete address.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={18} color="#059669" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Addresses</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web SavedAddresses.jsx */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#059669" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Saved Addresses</Text>
            <Text style={styles.headerSubtitle}>Manage delivery locations for quick checkout.</Text>
          </View>
          <TouchableOpacity 
            style={styles.addNewBtn}
            onPress={() => navigation.navigate('AddAddressScreen')}
            activeOpacity={0.85}
          >
            <Feather name="plus" size={16} color="#FFFFFF" />
            <Text style={styles.addNewBtnText}>Add New</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} tintColor="#059669" />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="map-pin" size={40} color="#059669" />
            </View>
            <Text style={styles.emptyTitle}>No saved addresses</Text>
            <Text style={styles.emptySubtitle}>
              Add an address to make placing orders fast and seamless.
            </Text>
            <TouchableOpacity 
              style={styles.addFirstBtn}
              onPress={() => navigation.navigate('AddAddressScreen')}
              activeOpacity={0.85}
            >
              <Text style={styles.addFirstBtnText}>+ Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <View style={styles.cardTop}>
              <View style={styles.titleBadgeRow}>
                <View style={styles.titleIconCircle}>
                  <Feather name="map-pin" size={14} color="#059669" />
                </View>
                <Text style={styles.titleBadgeText}>
                  {item.title || item.address_type || 'Home'}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('AddAddressScreen', { editingAddress: item })}
                  activeOpacity={0.7}
                >
                  <Feather name="edit-2" size={16} color="#4F46E5" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtn}
                  onPress={() => deleteAddress(item.id)}
                  activeOpacity={0.7}
                >
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.addressBody}>
              <Text style={styles.streetText}>{item.street || item.address_line_1 || ''}</Text>
              
              {(item.landmark || item.address_line_2) ? (
                <Text style={styles.subDetailText}>Landmark: {item.landmark || item.address_line_2}</Text>
              ) : null}

              <Text style={styles.subDetailText}>
                {[item.city, item.district].filter(Boolean).join(', ')}
              </Text>

              <Text style={styles.subDetailText}>
                {[item.state, item.country || 'India', item.zip_code || item.pincode].filter(Boolean).join(', ')}
              </Text>

              {item.latitude && item.longitude ? (
                <View style={styles.gpsSecuredBadge}>
                  <Feather name="check-circle" size={12} color="#059669" />
                  <Text style={styles.gpsSecuredText}>Exact Location Saved</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      />
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
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  addNewBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    maxWidth: 280,
  },
  addFirstBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addFirstBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  addressBody: {
    paddingLeft: 36,
    gap: 3,
  },
  streetText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 20,
  },
  subDetailText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 18,
  },
  pincodeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
  gpsSecuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  gpsSecuredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
});
