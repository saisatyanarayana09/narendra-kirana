import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { apiClient } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getCachedAddressesSync, loadCachedAddresses, saveCachedAddresses } from '../../services/profileCache';

export function AddressesScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const cachedAddresses = getCachedAddressesSync(user?.id);
  const [addresses, setAddresses] = useState<any[]>(cachedAddresses || []);
  const [loading, setLoading] = useState(!cachedAddresses || cachedAddresses.length === 0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setLoading(false);
      return;
    }
    if (addresses.length === 0) {
      loadCachedAddresses(user.id).then((cached) => {
        if (cached && cached.length > 0) {
          setAddresses(cached);
          setLoading(false);
        }
      });
    }
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddresses();
    });
    fetchAddresses();
    return unsubscribe;
  }, [navigation, user]);

  const fetchAddresses = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await apiClient.get('/auth/addresses/');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setAddresses(list);
      saveCachedAddresses(user.id, list);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (!user) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    fetchAddresses();
  }, [user]);

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

  const handleSetDefault = async (id: number) => {
    try {
      await apiClient.patch(`/auth/addresses/${id}/`, { is_default: true });
      setAddresses(prev => prev.map(a => ({
        ...a,
        is_default: a.id === id,
      })));
    } catch (err) {
      console.error('Failed to set default address:', err);
      Alert.alert('Error', 'Failed to set default address.');
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Addresses</Text>
        </View>
        <View style={styles.guestStateContainer}>
          <View style={[styles.guestIconBox, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5' }]}>
            <Feather name="map-pin" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In to Access Addresses</Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Save delivery addresses for faster checkout, live GPS tracking, and seamless ordering.
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

  if (loading && addresses.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Addresses</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web SavedAddresses.jsx */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Saved Addresses</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Manage delivery locations for quick checkout.</Text>
          </View>
          <TouchableOpacity 
            style={[styles.addNewBtn, { backgroundColor: colors.primary }]}
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
        keyExtractor={(item, index) => String(item?.id || item?.uuid || item?.uid || index)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={() => (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#D1FAE5' }]}>
              <Feather name="map-pin" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No saved addresses</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Add an address to make placing orders fast and seamless.
            </Text>
            <TouchableOpacity 
              style={[styles.addFirstBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AddAddressScreen')}
              activeOpacity={0.85}
            >
              <Text style={styles.addFirstBtnText}>+ Add Delivery Address</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[styles.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardTop}>
              <View style={styles.titleBadgeRow}>
                <View style={[styles.titleIconCircle, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
                  <Feather name="map-pin" size={14} color={colors.primary} />
                </View>
                <Text style={[styles.titleBadgeText, { color: colors.text }]}>
                  {item.title || item.address_type || 'Home'}
                </Text>
                {item.is_default && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                {!item.is_default && (
                  <TouchableOpacity 
                    style={[styles.setDefaultBtn, { borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0' }]}
                    onPress={() => handleSetDefault(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    activeOpacity={0.7}
                  >
                    <Feather name="check" size={12} color={colors.textSecondary} />
                    <Text style={[styles.setDefaultBtnText, { color: colors.textSecondary }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC' }]}
                  onPress={() => navigation.navigate('AddAddressScreen', { editingAddress: item })}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="edit-2" size={16} color="#818CF8" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC' }]}
                  onPress={() => deleteAddress(item.id)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="trash-2" size={16} color="#FB7185" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.addressBody}>
              <Text style={[styles.streetText, { color: colors.text }]}>{item.street || item.address_line_1 || ''}</Text>
              
              {(item.landmark || item.address_line_2) ? (
                <Text style={[styles.subDetailText, { color: colors.textSecondary }]}>Landmark: {item.landmark || item.address_line_2}</Text>
              ) : null}

              <Text style={[styles.subDetailText, { color: colors.textSecondary }]}>
                {[item.city, item.district].filter(Boolean).join(', ')}
              </Text>

              <Text style={[styles.subDetailText, { color: colors.textSecondary }]}>
                {[item.state, item.country || 'India', item.zip_code || item.pincode].filter(Boolean).join(', ')}
              </Text>

              {item.latitude && item.longitude ? (
                <View style={[styles.gpsSecuredBadge, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#ECFDF5' }]}>
                  <Feather name="check-circle" size={12} color={colors.primary} />
                  <Text style={[styles.gpsSecuredText, { color: colors.primary }]}>Exact Location Saved</Text>
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
    lineHeight: 26,
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
    boxShadow: '0px 2px 3px rgba(5, 150, 105, 0.15)',
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
    paddingBottom: 130,
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
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.03)',
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
  defaultBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  defaultBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setDefaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  setDefaultBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtn: {
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
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
    boxShadow: '0px 4px 8px rgba(5, 150, 105, 0.2)',
    elevation: 4,
  },
  guestSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
