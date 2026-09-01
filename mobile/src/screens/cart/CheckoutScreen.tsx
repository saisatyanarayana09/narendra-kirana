import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { apiClient } from '../../api/client';
import { useLocation } from '../../hooks/useLocation';

export function CheckoutScreen({ navigation }: any) {
  const { cart, refreshCart } = useCart();
  const { requestLocation, location: gpsLocation, isRequesting: gpsLoading } = useLocation();

  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  
  const [pickupTime, setPickupTime] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddressesAndWallet();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchAddressesAndWallet = async () => {
    try {
      const [addrRes, walletRes] = await Promise.all([
        apiClient.get('/auth/addresses/'),
        apiClient.get('/auth/wallet/')
      ]);
      setAddresses(addrRes.data);
      if (addrRes.data.length > 0) {
        setSelectedAddress(addrRes.data[0]);
      }
      setWalletBalance(walletRes.data.balance || 0);
    } catch (error) {
      console.error('Error fetching checkout dependencies', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'DELIVERY' && !selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (orderType === 'PICKUP' && !pickupTime) {
      Alert.alert('Error', 'Please provide a pickup time (e.g. "Today 5 PM")');
      return;
    }

    setIsSubmitting(true);
    let coords = gpsLocation;
    if (orderType === 'DELIVERY' && !coords) {
      coords = await requestLocation();
    }

    const payload = {
      order_type: orderType,
      use_wallet: useWallet,
      customer_note: customerNote,
      ...(orderType === 'DELIVERY' ? {
        delivery_address: `${selectedAddress.address_line_1}, ${selectedAddress.address_line_2}, ${selectedAddress.city}`,
        delivery_pincode: selectedAddress.pincode,
        delivery_latitude: coords?.latitude || null,
        delivery_longitude: coords?.longitude || null,
      } : {
        pickup_time: pickupTime,
      })
    };

    try {
      const response = await apiClient.post('/orders/', payload);
      await refreshCart(); // Cart is now empty
      
      // Navigate to success screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'OrderSuccessScreen', params: { orderId: response.data.id } }],
      });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to place order';
      Alert.alert('Order Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Order Type Selection */}
        <View style={styles.typeSelector}>
          <TouchableOpacity 
            style={[styles.typeButton, orderType === 'DELIVERY' && styles.typeButtonActiveDelivery]}
            onPress={() => setOrderType('DELIVERY')}
          >
            <Feather name="map-pin" color={orderType === 'DELIVERY' ? theme.colors.indigo : theme.colors.textSecondary} size={16} />
            <Text style={[styles.typeText, orderType === 'DELIVERY' && styles.typeTextActiveDelivery]}>Home Delivery</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeButton, orderType === 'PICKUP' && styles.typeButtonActivePickup]}
            onPress={() => setOrderType('PICKUP')}
          >
            <Feather name="shopping-bag" color={orderType === 'PICKUP' ? theme.colors.primary : theme.colors.textSecondary} size={16} />
            <Text style={[styles.typeText, orderType === 'PICKUP' && styles.typeTextActivePickup]}>Store Pickup</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Section Based on Order Type */}
        {orderType === 'DELIVERY' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <TouchableOpacity onPress={() => navigation.navigate('AddAddressScreen')}>
                <Text style={styles.addButton}>+ Add New</Text>
              </TouchableOpacity>
            </View>
            
            {addresses.length === 0 ? (
              <View style={styles.emptyAddressBox}>
                <Text style={styles.emptyAddressText}>No saved addresses found.</Text>
              </View>
            ) : (
              addresses.map((addr) => (
                <TouchableOpacity 
                  key={addr.id}
                  style={[styles.addressCard, selectedAddress?.id === addr.id && styles.addressCardSelected]}
                  onPress={() => setSelectedAddress(addr)}
                >
                  <View style={styles.addressTypeBadge}>
                    <Text style={styles.addressTypeText}>{addr.address_type}</Text>
                  </View>
                  <Text style={styles.addressText}>{addr.address_line_1}</Text>
                  {addr.address_line_2 ? <Text style={styles.addressText}>{addr.address_line_2}</Text> : null}
                  <Text style={styles.addressText}>{addr.city}, {addr.state} - {addr.pincode}</Text>
                </TouchableOpacity>
              ))
            )}

            {/* GPS Warning */}
            <View style={styles.gpsBox}>
              <Feather name="map-pin" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.gpsText}>
                {gpsLocation ? 'Live GPS Location captured ✓' : 'We will capture your GPS location upon checkout to help our rider find you easily.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pickup Time</Text>
            <TextInput
              style={styles.input}
              placeholder="E.g., Today at 5:00 PM"
              value={pickupTime}
              onChangeText={setPickupTime}
            />
            <Text style={styles.hintText}>Our store address: Main Road, Kirana Market</Text>
          </View>
        )}

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Note (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Any special instructions?"
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
          />
        </View>

        {/* Wallet */}
        {walletBalance > 0 && (
          <View style={styles.walletSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="credit-card" size={24} color={theme.colors.primary} />
              <View style={{ marginLeft: theme.spacing.sm }}>
                <Text style={styles.walletTitle}>Narendra Kirana Wallet</Text>
                <Text style={styles.walletBalance}>Available Balance: ₹{walletBalance}</Text>
              </View>
            </View>
            <Switch
              value={useWallet}
              onValueChange={setUseWallet}
              trackColor={{ false: theme.colors.border, true: theme.colors.primaryLight }}
              thumbColor={useWallet ? theme.colors.primary : theme.colors.surface}
            />
          </View>
        )}

      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotalLabel}>Total Due</Text>
          <Text style={styles.bottomTotalValue}>₹{cart.total}</Text>
        </View>
        <TouchableOpacity 
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || gpsLoading}
        >
          {isSubmitting || gpsLoading ? (
            <ActivityIndicator color={theme.colors.surface} size="small" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // bg-slate-100
    borderRadius: 12,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: 8,
    gap: theme.spacing.sm,
  },
  typeButtonActiveDelivery: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeButtonActivePickup: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  typeTextActiveDelivery: {
    color: theme.colors.indigo,
  },
  typeTextActivePickup: {
    color: theme.colors.primary,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  addButton: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    backgroundColor: theme.colors.indigoLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyAddressBox: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyAddressText: {
    color: theme.colors.textSecondary,
  },
  addressCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  addressCardSelected: {
    borderColor: theme.colors.indigo,
    backgroundColor: theme.colors.indigoLight,
  },
  addressTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  addressTypeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  gpsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.indigoLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  gpsText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 15,
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  walletSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.lg,
  },
  walletTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  walletBalance: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  bottomTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: theme.colors.textSecondary,
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: theme.colors.text,
  },
  placeOrderButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    minWidth: 160,
    alignItems: 'center',
  },
  placeOrderText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
