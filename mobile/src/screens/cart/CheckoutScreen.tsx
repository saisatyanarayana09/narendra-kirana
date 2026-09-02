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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useCart } from '../../context/CartContext';
import { apiClient } from '../../api/client';
import { useLocation } from '../../hooks/useLocation';

export function CheckoutScreen({ navigation }: { navigation: AppNavigationProp }) {
  const insets = useSafeAreaInsets();
  const { cart, refreshCart, storeSettings } = useCart();
  const { requestLocation, isRequesting: gpsLoading } = useLocation();

  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('PICKUP');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Address Form State (inline address management matching web cart.jsx)
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({
    title: 'Home',
    street: '',
    landmark: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    zip_code: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const [pickupTime, setPickupTime] = useState('As soon as possible');
  const [customerNote, setCustomerNote] = useState('');

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      if (addrList.length > 0 && !selectedAddressId) {
        const defaultAddr = addrList.find((a: any) => a.is_default) || addrList[0];
        setSelectedAddressId(defaultAddr.id);
      }
      setWalletBalance(parseFloat(walletRes.data?.balance || '0'));
    } catch (err) {
      console.error('Error fetching checkout dependencies', err);
    }
  };

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) || null;

  const formatAddressString = (addr: any) => {
    if (!addr) return '';
    const street = addr.street || addr.address_line_1 || '';
    const landmark = addr.landmark || addr.address_line_2 || '';
    const city = addr.city || '';
    const state = addr.state || '';
    return [street, landmark, city, state].filter(Boolean).join(', ');
  };

  // GPS Location capture for address form
  const handleCaptureGps = async () => {
    const loc = await requestLocation();
    if (loc) {
      setAddressForm(prev => ({
        ...prev,
        latitude: parseFloat(loc.latitude.toFixed(6)),
        longitude: parseFloat(loc.longitude.toFixed(6)),
      }));
    } else {
      Alert.alert('GPS Error', 'Could not get location. Please enable GPS permissions.');
    }
  };

  const handleSaveAddress = async () => {
    if (
      !addressForm.title.trim() || 
      !addressForm.street.trim() || 
      !addressForm.city.trim() || 
      !addressForm.state.trim() || 
      !addressForm.zip_code.trim()
    ) {
      Alert.alert('Validation Error', 'Please fill in Title, Street, City, State, and Pincode.');
      return;
    }

    setSavingAddress(true);
    setError('');
    try {
      if (editingAddressId) {
        const res = await apiClient.put(`/auth/addresses/${editingAddressId}/`, addressForm);
        setAddresses(prev => prev.map(a => a.id === editingAddressId ? res.data : a));
        setSelectedAddressId(editingAddressId);
      } else {
        const res = await apiClient.post('/auth/addresses/', addressForm);
        setAddresses(prev => [...prev, res.data]);
        setSelectedAddressId(res.data.id);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
    } catch (err: any) {
      const msg = err.response?.data?.latitude?.[0] || err.response?.data?.detail || err.response?.data?.error || 'Failed to save address.';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditAddress = (addr: any) => {
    setAddressForm({
      title: addr.title || 'Home',
      street: addr.street || addr.address_line_1 || '',
      landmark: addr.landmark || addr.address_line_2 || '',
      city: addr.city || '',
      district: addr.district || '',
      state: addr.state || '',
      country: addr.country || 'India',
      zip_code: addr.zip_code || addr.pincode || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    });
    setEditingAddressId(addr.id);
    setShowAddressForm(true);
  };

  const handleAddNewAddress = () => {
    setAddressForm({
      title: 'Home',
      street: '',
      landmark: '',
      city: '',
      district: '',
      state: '',
      country: 'India',
      zip_code: '',
      latitude: null,
      longitude: null,
    });
    setEditingAddressId(null);
    setShowAddressForm(true);
  };

  // Store status and min order thresholds
  const isStoreClosed = storeSettings?.is_open === false;
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || '0');
  const cartSubtotal = parseFloat(cart?.subtotal || '0');
  const isBelowMinOrder = minOrderAmount > 0 && cartSubtotal < minOrderAmount;

  const isHomeDeliveryActive = storeSettings?.is_home_delivery_active !== false;
  const minDeliveryAmount = parseFloat(storeSettings?.min_delivery_order_amount || '0');
  const isBelowMinDelivery = orderType === 'DELIVERY' && minDeliveryAmount > 0 && cartSubtotal < minDeliveryAmount;

  // Dynamic delivery fee calculation matching store settings
  let deliveryFee = 0;
  if (orderType === 'DELIVERY' && isHomeDeliveryActive) {
    const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || '0');
    if (freeThreshold > 0 && cartSubtotal >= freeThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || '0');
    }
  }

  const baseCartTotal = parseFloat(cart?.total || '0') + deliveryFee;
  const walletApplied = useWallet ? Math.min(baseCartTotal, walletBalance) : 0;
  const finalTotalToPay = Math.max(0, baseCartTotal - walletApplied);

  // Dynamic button label matching web cart.jsx
  const placeOrderBtnLabel = isSubmitting 
    ? 'Processing...' 
    : finalTotalToPay === 0
      ? 'Place order (Paid via Wallet)'
      : orderType === 'DELIVERY'
        ? 'Place order (Cash on Delivery)'
        : 'Place order (Pay at store)';

  const handlePlaceOrder = async () => {
    if (isStoreClosed) {
      Alert.alert('Store Closed', 'The store is currently closed and not accepting new orders.');
      return;
    }

    if (isBelowMinOrder) {
      Alert.alert('Minimum Order', `Minimum order amount is ₹${minOrderAmount.toFixed(2)}.`);
      return;
    }

    if (orderType === 'DELIVERY') {
      if (!isHomeDeliveryActive) {
        Alert.alert('Unavailable', 'Home delivery is currently unavailable.');
        return;
      }
      if (isBelowMinDelivery) {
        Alert.alert('Minimum Delivery Order', `Home Delivery requires a minimum cart total of ₹${minDeliveryAmount.toFixed(2)}.`);
        return;
      }
      if (!selectedAddress) {
        setError('Please select or add a delivery address.');
        Alert.alert('Error', 'Please select or add a delivery address.');
        return;
      }
      if (selectedAddress && (selectedAddress.latitude == null || selectedAddress.longitude == null)) {
        Alert.alert('Location Missing', 'GPS location is missing for this address. Please edit your address to capture your location for doorstep delivery.');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');

    const formattedAddress = selectedAddress ? formatAddressString(selectedAddress) : '';
    const formattedPincode = selectedAddress ? (selectedAddress.zip_code || selectedAddress.pincode || '') : '';

    const payload = {
      order_type: orderType,
      use_wallet: useWallet,
      customer_note: customerNote,
      pickup_time: orderType === 'PICKUP' ? (pickupTime || 'As soon as possible') : '',
      delivery_address: orderType === 'DELIVERY' ? formattedAddress : '',
      delivery_pincode: orderType === 'DELIVERY' ? formattedPincode : '',
      delivery_latitude: orderType === 'DELIVERY' ? (selectedAddress?.latitude || null) : null,
      delivery_longitude: orderType === 'DELIVERY' ? (selectedAddress?.longitude || null) : null,
    };

    try {
      const response = await apiClient.post('/orders/', payload);
      // Non-blocking background cart refresh
      refreshCart().catch(() => {});
      navigation.navigate('OrderSuccessScreen', { orderId: response.data.id });
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Could not place your order.';
      setError(msg);
      Alert.alert('Order Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!cart || !cart.items || cart.items.length === 0) {
    navigation.navigate('CartScreen');
    return null;
  }

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
      >
        {/* Error Banner */}
        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Store Closed or Minimum Order Banner */}
        {isStoreClosed && (
          <View style={styles.closedWarning}>
            <Text style={styles.closedWarningText}>The store is currently closed. Cannot place order.</Text>
          </View>
        )}

        {isBelowMinOrder && (
          <View style={styles.minOrderWarning}>
            <Text style={styles.minOrderWarningText}>
              Minimum order amount is ₹{minOrderAmount.toFixed(2)}
            </Text>
          </View>
        )}

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
              {!showAddressForm && (
                <TouchableOpacity 
                  onPress={handleAddNewAddress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addNewAddrText}>+ Add New</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Inline Address Form */}
            {showAddressForm ? (
              <View style={styles.addressFormContainer}>
                <View style={styles.addressFormHeader}>
                  <Text style={styles.addressFormTitle}>
                    {editingAddressId ? 'Edit Address' : 'New Address'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setShowAddressForm(false);
                      setEditingAddressId(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelFormText}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {/* GPS Location Capture Button */}
                {!addressForm.latitude ? (
                  <TouchableOpacity 
                    style={styles.gpsCaptureBtn}
                    onPress={handleCaptureGps}
                    disabled={gpsLoading}
                    activeOpacity={0.85}
                  >
                    {gpsLoading ? (
                      <ActivityIndicator color="#4F46E5" size="small" />
                    ) : (
                      <>
                        <Feather name="map-pin" size={16} color="#4F46E5" />
                        <Text style={styles.gpsCaptureBtnText}>📍 Capture My Exact Location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.gpsSecuredBanner}>
                    <View style={styles.gpsSecuredLeft}>
                      <Feather name="check-circle" size={16} color="#059669" />
                      <Text style={styles.gpsSecuredText}>GPS Secured</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.relocateBtn}
                      onPress={handleCaptureGps}
                      disabled={gpsLoading}
                      activeOpacity={0.8}
                    >
                      <Feather name="refresh-cw" size={12} color="#059669" />
                      <Text style={styles.relocateBtnText}>Relocate</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Address Form Inputs */}
                <View style={styles.formGrid}>
                  <View style={styles.labelPillsRow}>
                    {['Home', 'Office', 'Other'].map((lbl) => (
                      <TouchableOpacity
                        key={lbl}
                        style={[styles.labelPill, addressForm.title === lbl && styles.labelPillActive]}
                        onPress={() => setAddressForm({ ...addressForm, title: lbl })}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.labelPillText, addressForm.title === lbl && styles.labelPillTextActive]}>
                          {lbl}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    placeholder="House/Flat No, Street *"
                    placeholderTextColor="#94A3B8"
                    value={addressForm.street}
                    onChangeText={(t) => setAddressForm({ ...addressForm, street: t })}
                    multiline
                    numberOfLines={2}
                  />

                  <TextInput
                    style={styles.formInput}
                    placeholder="Landmark (Optional)"
                    placeholderTextColor="#94A3B8"
                    value={addressForm.landmark}
                    onChangeText={(t) => setAddressForm({ ...addressForm, landmark: t })}
                  />

                  <View style={styles.formRowTwo}>
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      placeholder="City *"
                      placeholderTextColor="#94A3B8"
                      value={addressForm.city}
                      onChangeText={(t) => setAddressForm({ ...addressForm, city: t })}
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      placeholder="State *"
                      placeholderTextColor="#94A3B8"
                      value={addressForm.state}
                      onChangeText={(t) => setAddressForm({ ...addressForm, state: t })}
                    />
                  </View>

                  <TextInput
                    style={styles.formInput}
                    placeholder="Pincode *"
                    placeholderTextColor="#94A3B8"
                    value={addressForm.zip_code}
                    onChangeText={(t) => setAddressForm({ ...addressForm, zip_code: t })}
                    keyboardType="numeric"
                  />

                  <TouchableOpacity 
                    style={[styles.saveAddressBtn, savingAddress && styles.saveAddressBtnDisabled]}
                    onPress={handleSaveAddress}
                    disabled={savingAddress}
                    activeOpacity={0.85}
                  >
                    {savingAddress ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.saveAddressBtnText}>Save Address</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                {addresses.length === 0 ? (
                  <View style={styles.emptyAddressBox}>
                    <Text style={styles.emptyAddressText}>No saved addresses found.</Text>
                    <TouchableOpacity 
                      style={styles.addFirstAddrBtn}
                      onPress={handleAddNewAddress}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.addFirstAddrBtnText}>+ Add Delivery Address</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.addressList}>
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <TouchableOpacity 
                          key={addr.id}
                          style={[styles.addressItemCard, isSelected && styles.addressItemSelected]}
                          onPress={() => setSelectedAddressId(addr.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.addressRadioCircle, isSelected && styles.addressRadioSelectedCircle]}>
                            {isSelected && <View style={styles.addressRadioInner} />}
                          </View>

                          <View style={styles.addressInfo}>
                            <View style={styles.addressItemHeader}>
                              <View style={styles.addressTypeBadge}>
                                <Text style={styles.addressTypeText}>{addr.title || 'Home'}</Text>
                              </View>
                              <TouchableOpacity 
                                onPress={() => handleEditAddress(addr)}
                                style={styles.editAddrIconBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              >
                                <Feather name="edit-2" size={14} color="#6366F1" />
                              </TouchableOpacity>
                            </View>

                            <Text style={styles.addressLineText}>{addr.street}</Text>
                            {Boolean(addr.landmark) && (
                              <Text style={styles.addressLandmarkText}>{addr.landmark}</Text>
                            )}
                            <Text style={styles.addressCityStateText}>
                              {[addr.city, addr.state].filter(Boolean).join(', ')} - {addr.zip_code || addr.pincode}
                            </Text>

                            {Boolean(addr.latitude) && (
                              <View style={styles.addrGpsTag}>
                                <Feather name="check-circle" size={11} color="#059669" />
                                <Text style={styles.addrGpsTagText}>GPS Secured</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* Minimum Delivery Amount Warning */}
            {isBelowMinDelivery && (
              <View style={styles.minDeliveryWarning}>
                <Feather name="alert-circle" size={14} color="#B91C1C" />
                <Text style={styles.minDeliveryWarningText}>
                  Home Delivery requires a minimum cart total of ₹{minDeliveryAmount.toFixed(2)}.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardSectionLabel}>Pickup time</Text>
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
          <Text style={styles.cardSectionLabel}>Note for the store (optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="E.g., Please pack fragile items carefully..."
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
                <MaterialIcons name="currency-rupee" size={20} color="#059669" />
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

        {/* Full Billing Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{cartSubtotal.toFixed(2)}</Text>
          </View>

          {parseFloat(cart?.discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Product Savings</Text>
              <Text style={styles.savingsValue}>
                -₹{parseFloat(cart.discount).toFixed(2)}
              </Text>
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

          {useWallet && walletApplied > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Wallet Applied</Text>
              <Text style={styles.savingsValue}>-₹{walletApplied.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due</Text>
            <Text style={styles.totalValue}>₹{finalTotalToPay.toFixed(2)}</Text>
          </View>

          {/* Store status warnings inside summary */}
          {isStoreClosed ? (
            <View style={styles.summaryClosedBanner}>
              <Text style={styles.summaryClosedBannerText}>The store is currently closed. Cannot place order.</Text>
            </View>
          ) : isBelowMinOrder ? (
            <View style={styles.summaryMinOrderBanner}>
              <Text style={styles.summaryMinOrderBannerText}>Minimum order amount is ₹{minOrderAmount.toFixed(2)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Place Order Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View>
          <Text style={styles.bottomTotalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.bottomTotalValue}>₹{finalTotalToPay.toFixed(2)}</Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.placeOrderBtn,
            (isSubmitting || isStoreClosed || isBelowMinOrder || (orderType === 'DELIVERY' && (!selectedAddress || isBelowMinDelivery))) && styles.disabledPlaceOrderBtn
          ]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || isStoreClosed || isBelowMinOrder || (orderType === 'DELIVERY' && (!selectedAddress || isBelowMinDelivery))}
          activeOpacity={0.9}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.placeOrderBtnText}>{placeOrderBtnLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  closedWarning: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  closedWarningText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  minOrderWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },
  minOrderWarningText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
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
    color: '#4F46E5',
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
  addressFormContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  cancelFormText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  gpsCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  gpsCaptureBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4F46E5',
  },
  gpsSecuredBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  gpsSecuredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gpsSecuredText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  relocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  relocateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  formGrid: {
    gap: 10,
  },
  labelPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelPillActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  labelPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  labelPillTextActive: {
    color: '#4F46E5',
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  formTextArea: {
    height: 55,
    textAlignVertical: 'top',
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 8,
  },
  saveAddressBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveAddressBtnDisabled: {
    opacity: 0.6,
  },
  saveAddressBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
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
  addressList: {
    gap: 8,
  },
  addressItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  addressItemSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  addressRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  addressRadioSelectedCircle: {
    borderColor: '#4F46E5',
  },
  addressRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  addressInfo: {
    flex: 1,
  },
  addressItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTypeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addressTypeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  editAddrIconBtn: {
    padding: 4,
  },
  addressLineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 18,
  },
  addressLandmarkText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  addressCityStateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  addrGpsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  addrGpsTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  minDeliveryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  minDeliveryWarningText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
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
    minHeight: 65,
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
  summaryClosedBanner: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  summaryClosedBannerText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  summaryMinOrderBanner: {
    marginTop: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  summaryMinOrderBannerText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledPlaceOrderBtn: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeOrderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
