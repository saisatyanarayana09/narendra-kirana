import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert, 
  Switch 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { useCart } from '../../context/CartContext';
import { apiClient } from '../../api/client';
import { useLocation } from '../../hooks/useLocation';

export function CheckoutScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { cart, refreshCart, storeSettings } = useCart();
  const { requestLocation, location: gpsLocation, isRequesting: gpsLoading } = useLocation();

  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('PICKUP');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  
  const [pickupTime, setPickupTime] = useState('As soon as possible');
  const [customerNote, setCustomerNote] = useState('');
  
  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddressesAndWallet();
    });
    fetchAddressesAndWallet();
    return unsubscribe;
  }, [navigation]);

  const fetchAddressesAndWallet = async () => {
    try {
      const [addrRes, walletRes] = await Promise.all([
        apiClient.get('/auth/addresses/').catch(() => ({ data: [] })),
        apiClient.get('/auth/wallet/').catch(() => ({ data: { balance: 0 } }))
      ]);
      const addrList = Array.isArray(addrRes.data) ? addrRes.data : (addrRes.data?.results || []);
      setAddresses(addrList);
      if (addrList.length > 0 && !selectedAddress) {
        const defaultAddr = addrList.find((a: any) => a.is_default) || addrList[0];
        setSelectedAddress(defaultAddr);
      }
      setWalletBalance(parseFloat(walletRes.data?.balance || '0'));
    } catch (error) {
      console.error('Error fetching checkout dependencies', error);
    }
  };

  const isHomeDeliveryActive = storeSettings?.is_home_delivery_active !== false;

  // Calculate delivery fee
  const cartSubtotal = parseFloat(cart?.subtotal || '0');
  let deliveryFee = 0;
  if (orderType === 'DELIVERY' && isHomeDeliveryActive) {
    const threshold = parseFloat(storeSettings?.free_delivery_threshold || '0');
    if (threshold > 0 && cartSubtotal >= threshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || '0');
    }
  }

  const baseCartTotal = parseFloat(cart?.total || '0') + deliveryFee;
  const walletApplied = useWallet ? Math.min(baseCartTotal, walletBalance) : 0;
  const finalTotalToPay = Math.max(0, baseCartTotal - walletApplied);

  const formatAddressString = (addr: any) => {
    if (!addr) return '';
    const street = addr.street || addr.address_line_1 || '';
    const landmark = addr.landmark || addr.address_line_2 || '';
    const city = addr.city || '';
    const state = addr.state || '';
    return [street, landmark, city, state].filter(Boolean).join(', ');
  };

  const handlePlaceOrder = async () => {
    if (orderType === 'DELIVERY') {
      if (!selectedAddress) {
        Alert.alert('Error', 'Please select or add a delivery address.');
        return;
      }
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
        delivery_address: formatAddressString(selectedAddress),
        delivery_pincode: selectedAddress?.zip_code || selectedAddress?.pincode || '',
        delivery_latitude: coords?.latitude || selectedAddress?.latitude || null,
        delivery_longitude: coords?.longitude || selectedAddress?.longitude || null,
      } : {
        pickup_time: pickupTime || 'As soon as possible',
      })
    };

    try {
      const response = await apiClient.post('/orders/', payload);
      await refreshCart();
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'OrderSuccessScreen', params: { orderId: response.data.id } }],
      });
    } catch (error: any) {
      const msg = error.response?.data?.detail || error.response?.data?.error || 'Failed to place order';
      Alert.alert('Order Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header matching web */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color="#059669" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <Text style={styles.headerSubtitle}>Review your order and pick a time.</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Type Toggle Tabs */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Order Type</Text>
          <View style={styles.typeToggleContainer}>
            <TouchableOpacity 
              style={[styles.typeToggleBtn, orderType === 'PICKUP' && styles.typeToggleActivePickup]}
              onPress={() => setOrderType('PICKUP')}
              activeOpacity={0.8}
            >
              <Feather 
                name="shopping-bag" 
                size={16} 
                color={orderType === 'PICKUP' ? "#059669" : "#64748B"} 
              />
              <Text style={[styles.typeToggleText, orderType === 'PICKUP' && styles.typeTextActivePickup]}>
                Store Pickup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.typeToggleBtn, 
                orderType === 'DELIVERY' && styles.typeToggleActiveDelivery,
                !isHomeDeliveryActive && styles.disabledToggleBtn
              ]}
              onPress={() => isHomeDeliveryActive && setOrderType('DELIVERY')}
              disabled={!isHomeDeliveryActive}
              activeOpacity={0.8}
            >
              <Feather 
                name="truck" 
                size={16} 
                color={orderType === 'DELIVERY' ? "#4F46E5" : "#64748B"} 
              />
              <Text style={[styles.typeToggleText, orderType === 'DELIVERY' && styles.typeTextActiveDelivery]}>
                Home Delivery {!isHomeDeliveryActive && '(Unavailable)'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Section: Delivery Address or Pickup Time */}
        {orderType === 'DELIVERY' ? (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionLabel}>Select Delivery Address</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('AddAddressScreen')}
                activeOpacity={0.7}
              >
                <Text style={styles.addNewAddrText}>+ Add New</Text>
              </TouchableOpacity>
            </View>
            
            {addresses.length === 0 ? (
              <View style={styles.emptyAddressBox}>
                <Text style={styles.emptyAddressText}>No saved addresses found.</Text>
                <TouchableOpacity 
                  style={styles.addFirstAddrBtn}
                  onPress={() => navigation.navigate('AddAddressScreen')}
                >
                  <Text style={styles.addFirstAddrBtnText}>+ Add Delivery Address</Text>
                </TouchableOpacity>
              </View>
            ) : (
              addresses.map((addr) => {
                const isSelected = selectedAddress?.id === addr.id;
                return (
                  <TouchableOpacity 
                    key={addr.id}
                    style={[styles.addressItemCard, isSelected && styles.addressItemSelected]}
                    onPress={() => setSelectedAddress(addr)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.addressRadioCircle}>
                      {isSelected && <View style={styles.addressRadioInner} />}
                    </View>

                    <View style={styles.addressInfo}>
                      <View style={styles.addressTypeBadge}>
                        <Text style={styles.addressTypeText}>{addr.title || addr.address_type || 'Home'}</Text>
                      </View>
                      <Text style={styles.addressLineText}>{formatAddressString(addr)}</Text>
                      {(addr.zip_code || addr.pincode) && (
                        <Text style={styles.pincodeText}>Pincode: {addr.zip_code || addr.pincode}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* GPS Location Status */}
            <View style={styles.gpsContainer}>
              <Feather name="navigation" size={14} color="#059669" />
              <Text style={styles.gpsInfoText}>
                {gpsLocation ? 'Live GPS Location attached to order ✓' : 'We will capture your GPS location at checkout to assist delivery.'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>Pickup Time</Text>
            <View style={styles.pickupTimeOptions}>
              {['As soon as possible', 'In 30 minutes', 'In 1 hour'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.pickupSlotPill, pickupTime === slot && styles.pickupSlotPillActive]}
                  onPress={() => setPickupTime(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pickupSlotText, pickupTime === slot && styles.pickupSlotTextActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.storeAddressHint}>
              Store Location: {storeSettings?.store_address || 'Main Road, Kirana Market'}
            </Text>
          </View>
        )}

        {/* Customer Instructions Note */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>Additional Instructions (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add any instructions for packing or delivery..."
            placeholderTextColor="#94A3B8"
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Digital Wallet Card */}
        {walletBalance > 0 && (
          <View style={styles.walletCard}>
            <View style={styles.walletLeft}>
              <View style={styles.walletIconBox}>
                <Feather name="dollar-sign" size={20} color="#059669" />
              </View>
              <View>
                <Text style={styles.walletTitle}>Use Wallet Balance</Text>
                <Text style={styles.walletBalanceText}>Available: ₹{walletBalance.toFixed(2)}</Text>
              </View>
            </View>
            <Switch
              value={useWallet}
              onValueChange={setUseWallet}
              trackColor={{ false: '#CBD5E1', true: '#A7F3D0' }}
              thumbColor={useWallet ? '#059669' : '#FFFFFF'}
            />
          </View>
        )}

        {/* Final Order Breakdown Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{cartSubtotal.toFixed(2)}</Text>
          </View>

          {parseFloat(cart?.discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Product Savings</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(cart.discount).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(cart?.promo_discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Promo Discount</Text>
              <Text style={styles.savingsValue}>-₹{parseFloat(cart.promo_discount).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(cart?.packaging_fee || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Packaging Fee</Text>
              <Text style={styles.summaryValue}>₹{parseFloat(cart.packaging_fee).toFixed(2)}</Text>
            </View>
          )}

          {orderType === 'DELIVERY' && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>
                {deliveryFee === 0 ? <Text style={styles.freeText}>FREE</Text> : `₹${deliveryFee.toFixed(2)}`}
              </Text>
            </View>
          )}

          {walletApplied > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Wallet Applied</Text>
              <Text style={styles.savingsValue}>-₹{walletApplied.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>₹{finalTotalToPay.toFixed(2)}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Sticky Bottom Place Order Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.bottomTotalValue}>₹{finalTotalToPay.toFixed(2)}</Text>
        </View>

        <TouchableOpacity 
          style={styles.placeOrderBtn}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || gpsLoading}
          activeOpacity={0.9}
        >
          {isSubmitting || gpsLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.placeOrderBtnText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardSectionLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addNewAddrText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5', // indigo-600
  },
  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 6,
  },
  typeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeToggleActivePickup: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  typeToggleActiveDelivery: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  disabledToggleBtn: {
    opacity: 0.5,
  },
  typeToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  typeTextActivePickup: {
    color: '#059669',
  },
  typeTextActiveDelivery: {
    color: '#4F46E5',
  },
  emptyAddressBox: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  emptyAddressText: {
    color: '#64748B',
    fontSize: 13,
    marginBottom: 10,
  },
  addFirstAddrBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addFirstAddrBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  addressItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  addressItemSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  addressRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  addressRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  addressInfo: {
    flex: 1,
  },
  addressTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  addressTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  addressLineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  pincodeText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  gpsInfoText: {
    fontSize: 11,
    color: '#064E3B',
    fontWeight: '600',
    flex: 1,
  },
  pickupTimeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  pickupSlotPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickupSlotPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  pickupSlotText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pickupSlotTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  storeAddressHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  noteInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  walletCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
  },
  walletLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  walletBalanceText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '700',
  },
  savingsLabel: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  savingsValue: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700',
  },
  freeText: {
    color: '#059669',
    fontWeight: '800',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomTotalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  placeOrderBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  placeOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
