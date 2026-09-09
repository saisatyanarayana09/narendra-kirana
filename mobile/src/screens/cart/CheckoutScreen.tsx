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
  Switch,
  Modal,
  Linking as RNLinking
} from 'react-native';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/client';
import { useLocation } from '../../hooks/useLocation';
import { fixImageUrl } from '../../utils/image';

export function CheckoutScreen({ navigation }: { navigation: AppNavigationProp }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { cart, refreshCart, clearCart, storeSettings } = useCart();
  const { colors, isDark } = useTheme();
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

  // Time Slots State
  const [slotDay, setSlotDay] = useState<'TODAY' | 'TOMORROW'>('TODAY');
  const [selectedSlotLabel, setSelectedSlotLabel] = useState<string>('');

  // Payment Options & UPI State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('COD');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const [walletBalance, setWalletBalance] = useState(0);
  const [useWallet, setUseWallet] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Unauthenticated and empty cart navigation side-effects safely handled in useEffect
  useEffect(() => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to proceed to checkout.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else if (!cart || !cart.items || cart.items.length === 0) {
      navigation.navigate('CartScreen');
    }
  }, [user, cart, navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAddressesAndWallet();
    });
    fetchAddressesAndWallet();
    return unsubscribe;
  }, [navigation, user]);

  const fetchAddressesAndWallet = async () => {
    if (!user) return;
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

  // Store emergency pause and status
  const isEmergencyPaused = Boolean(storeSettings?.is_emergency_paused);
  const emergencyPauseMessage = storeSettings?.emergency_pause_message || 
    'We are currently experiencing high order volume and will resume shortly. Thank you for your patience!';
  const isStoreClosed = storeSettings?.is_open === false;

  const mrpTotal = parseFloat(cart?.subtotal || '0') || 0;
  const discount = parseFloat(cart?.discount || '0') || 0;
  const itemsTotal = parseFloat(cart?.items_total || '0') || Math.max(0, mrpTotal - discount);
  const minOrderAmount = parseFloat(storeSettings?.min_order_amount || '0') || 0;
  const isBelowMinOrder = minOrderAmount > 0 && itemsTotal < minOrderAmount;

  const isHomeDeliveryActive = storeSettings?.is_home_delivery_active !== false;
  const minDeliveryAmount = parseFloat(storeSettings?.min_delivery_order_amount || '0') || 0;
  const isBelowMinDelivery = orderType === 'DELIVERY' && minDeliveryAmount > 0 && itemsTotal < minDeliveryAmount;

  // Dynamic delivery fee calculation matching store settings
  let deliveryFee = 0;
  if (orderType === 'DELIVERY' && isHomeDeliveryActive) {
    const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || '0') || 0;
    if (freeThreshold > 0 && itemsTotal >= freeThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = parseFloat(storeSettings?.delivery_fee || '0') || 0;
    }
  }

  const baseCartTotal = (parseFloat(cart?.total || '0') || 0) + deliveryFee;

  // Max Wallet percentage limit enforcement
  const maxWalletUsagePct = typeof storeSettings?.max_wallet_usage_percentage === 'number'
    ? storeSettings.max_wallet_usage_percentage
    : 50;
  const maxWalletAllowed = Math.round((baseCartTotal * (maxWalletUsagePct / 100)) * 100) / 100;
  const walletApplied = useWallet ? Math.min(baseCartTotal, walletBalance || 0, maxWalletAllowed) : 0;
  const finalTotalToPay = Math.max(0, baseCartTotal - walletApplied);

  // Time Slots parsing and buffer calculation
  const parseMinutes = (timeStr: string, fallbackMeridiem?: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})(?:\s*([APap][Mm]))?/);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3]?.toUpperCase() || fallbackMeridiem?.toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const rawSlots = storeSettings?.time_slots_json;
  let parsedSlotsList: Array<{ start?: string; end?: string; label: string }> = [];

  if (Array.isArray(rawSlots)) {
    parsedSlotsList = rawSlots.map((s: any) => {
      if (typeof s === 'string') return { label: s };
      return { start: s.start || s.start_time, end: s.end || s.end_time, label: s.label || `${s.start} - ${s.end}` };
    });
  } else if (typeof rawSlots === 'string' && rawSlots.trim().length > 0) {
    try {
      const parsed = JSON.parse(rawSlots);
      if (Array.isArray(parsed)) {
        parsedSlotsList = parsed.map((s: any) => {
          if (typeof s === 'string') return { label: s };
          return { start: s.start || s.start_time, end: s.end || s.end_time, label: s.label || `${s.start} - ${s.end}` };
        });
      }
    } catch (e) {}
  }

  if (parsedSlotsList.length === 0) {
    parsedSlotsList = [
      { label: '08:00 AM - 10:00 AM', start: '08:00', end: '10:00' },
      { label: '10:00 AM - 12:00 PM', start: '10:00', end: '12:00' },
      { label: '12:00 PM - 02:00 PM', start: '12:00', end: '14:00' },
      { label: '02:00 PM - 04:00 PM', start: '14:00', end: '16:00' },
      { label: '04:00 PM - 06:00 PM', start: '16:00', end: '18:00' },
      { label: '06:00 PM - 08:00 PM', start: '18:00', end: '20:00' },
      { label: '08:00 PM - 10:00 PM', start: '20:00', end: '22:00' },
    ];
  }

  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = tomorrow.toISOString().split('T')[0];

  const todayFormatted = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const tomorrowFormatted = tomorrow.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const bufferMins = storeSettings?.preparation_buffer_minutes ?? 30;
  const currentMinutesFromMidnight = now.getHours() * 60 + now.getMinutes() + bufferMins;

  const isSlotPassedToday = (slot: { start?: string; end?: string; label: string }): boolean => {
    const timeToCompare = slot.start || slot.label.split('-')[0].trim();
    const endMeridiem = slot.label.match(/([APap][Mm])\s*$/)?.[1];
    const slotMinutes = parseMinutes(timeToCompare, endMeridiem);
    return slotMinutes <= currentMinutesFromMidnight;
  };

  const availableSlotsToday = parsedSlotsList.filter((s) => !isSlotPassedToday(s));

  // Initialize selected slot
  useEffect(() => {
    if (!selectedSlotLabel) {
      if (availableSlotsToday.length > 0) {
        setSelectedSlotLabel(availableSlotsToday[0].label);
      } else if (parsedSlotsList.length > 0) {
        setSlotDay('TOMORROW');
        setSelectedSlotLabel(parsedSlotsList[0].label);
      }
    }
  }, [availableSlotsToday.length, parsedSlotsList.length, selectedSlotLabel]);

  // UPI configuration & 1-Click Launch
  const payeeName = storeSettings?.upi_payee_name || storeSettings?.store_name || 'Narendra Kirana';
  const upiId = storeSettings?.upi_id || 'narendrakirana@okhdfcbank';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${finalTotalToPay.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Smart Kirana Order')}`;
  const qrImageUrl = storeSettings?.upi_qr_image 
    ? fixImageUrl(storeSettings.upi_qr_image) 
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`;

  const handlePayViaUpiApp = async () => {
    try {
      const canOpen = await RNLinking.canOpenURL(upiUrl);
      if (canOpen) {
        await RNLinking.openURL(upiUrl);
      } else {
        await RNLinking.openURL(upiUrl).catch(() => {
          setShowQrModal(true);
        });
      }
    } catch {
      setShowQrModal(true);
    }
  };

  const handleCopyUpiId = async () => {
    await Clipboard.setStringAsync(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Dynamic button label
  const placeOrderBtnLabel = isSubmitting 
    ? 'Processing...' 
    : finalTotalToPay === 0
      ? 'Place order (Paid via Wallet)'
      : paymentMethod === 'UPI'
        ? `Place order (Pay ₹${finalTotalToPay.toFixed(2)} via UPI)`
        : orderType === 'DELIVERY'
          ? 'Place order (Cash on Delivery)'
          : 'Place order (Pay at store)';

  const handlePlaceOrder = async () => {
    if (isEmergencyPaused) {
      Alert.alert('Orders Paused', emergencyPauseMessage);
      return;
    }

    if (isStoreClosed) {
      Alert.alert('Store Closed', 'The store is currently closed and not accepting new orders.');
      return;
    }

    if (isBelowMinOrder) {
      Alert.alert('Minimum Order', `Minimum order amount is ₹${minOrderAmount.toFixed(2)}.`);
      return;
    }

    if (storeSettings?.enable_time_slots) {
      if (slotDay === 'TODAY' && availableSlotsToday.length === 0) {
        Alert.alert('No Slots Available Today', 'All delivery slots for today have closed. Please select Tomorrow to schedule your order.');
        return;
      }
      if (!selectedSlotLabel) {
        Alert.alert('Select Time Slot', 'Please select a delivery or pickup time slot.');
        return;
      }
      if (slotDay === 'TODAY') {
        const matched = parsedSlotsList.find((s) => s.label === selectedSlotLabel);
        if (matched && isSlotPassedToday(matched)) {
          Alert.alert('Selected Slot Closed', 'The delivery slot you selected for today has closed. Please choose another available slot or select Tomorrow.');
          return;
        }
      }
    }

    if (paymentMethod === 'UPI' && finalTotalToPay > 0) {
      const cleanUtr = upiTransactionId.trim();
      if (!cleanUtr) {
        Alert.alert(
          'UPI Transaction ID Required',
          'Please complete the payment in your UPI app and enter the 12-digit UTR or Transaction ID before placing order.',
          [{ text: 'OK' }]
        );
        return;
      }
      if (cleanUtr.length < 12) {
        Alert.alert(
          'Invalid UTR / Transaction ID',
          'Please enter a valid 12-digit UTR or Transaction Reference number provided by your UPI app (Google Pay, PhonePe, Paytm).',
          [{ text: 'OK' }]
        );
        return;
      }
    }

    const hasOutOfStock = (cart?.items || []).some((item) => {
      const stockQty = item.stock_quantity ?? item.product?.stock_quantity ?? 999;
      const inStock = item.is_in_stock !== false && item.product?.is_in_stock !== false;
      return !inStock || stockQty <= 0;
    });
    if (hasOutOfStock) {
      Alert.alert('Items Out of Stock', 'Some items in your cart are currently out of stock. Please return to your cart and remove them before placing your order.');
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
    const chosenSlotDate = storeSettings?.enable_time_slots 
      ? (slotDay === 'TODAY' ? todayDateStr : tomorrowDateStr) 
      : null;
    const chosenSlotLabel = storeSettings?.enable_time_slots 
      ? selectedSlotLabel 
      : (orderType === 'PICKUP' ? (pickupTime || 'As soon as possible') : '');

    const payload = {
      order_type: orderType,
      use_wallet: useWallet,
      customer_note: customerNote,
      pickup_time: chosenSlotLabel || pickupTime || 'As soon as possible',
      delivery_address: orderType === 'DELIVERY' ? formattedAddress : '',
      delivery_pincode: orderType === 'DELIVERY' ? formattedPincode : '',
      delivery_latitude: orderType === 'DELIVERY' ? (selectedAddress?.latitude || null) : null,
      delivery_longitude: orderType === 'DELIVERY' ? (selectedAddress?.longitude || null) : null,
      delivery_slot_date: chosenSlotDate,
      delivery_slot_label: chosenSlotLabel,
      payment_method: finalTotalToPay === 0 ? 'WALLET' : paymentMethod,
      upi_transaction_id: paymentMethod === 'UPI' ? upiTransactionId.trim() : '',
    };

    try {
      const response = await apiClient.post('/orders/', payload);
      // Clean up cart state
      clearCart().catch(() => {});
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

  if (!user || !cart || !cart.items || cart.items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header matching web */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Review your order and pick a time.</Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
      >
        {/* Error Banner */}
        {Boolean(error) && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Store Emergency Pause Banner */}
        {isEmergencyPaused && (
          <View style={styles.emergencyPauseBanner}>
            <View style={styles.emergencyPauseIconCircle}>
              <Feather name="alert-triangle" size={18} color="#B45309" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyPauseTitle}>Orders Temporarily Paused</Text>
              <Text style={styles.emergencyPauseText}>{emergencyPauseMessage}</Text>
            </View>
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
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.text }]}>Order Type</Text>
          <View style={[styles.typeToggleContainer, { backgroundColor: colors.inputBg }]}>
            <TouchableOpacity 
              style={[
                styles.typeToggleBtn, 
                orderType === 'PICKUP' && [styles.typeToggleActivePickup, isDark && { backgroundColor: colors.surface }]
              ]}
              onPress={() => setOrderType('PICKUP')}
              activeOpacity={0.8}
            >
              <Feather 
                name="shopping-bag" 
                size={16} 
                color={orderType === 'PICKUP' ? colors.primary : colors.textSecondary} 
              />
              <Text style={[
                styles.typeToggleText, 
                { color: colors.textSecondary },
                orderType === 'PICKUP' && [styles.typeTextActivePickup, isDark && { color: colors.primary }]
              ]}>
                Store Pickup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.typeToggleBtn, 
                orderType === 'DELIVERY' && [styles.typeToggleActiveDelivery, isDark && { backgroundColor: colors.surface }],
                !isHomeDeliveryActive && styles.disabledToggleBtn
              ]}
              onPress={() => isHomeDeliveryActive && setOrderType('DELIVERY')}
              disabled={!isHomeDeliveryActive}
              activeOpacity={0.8}
            >
              <Feather 
                name="truck" 
                size={16} 
                color={orderType === 'DELIVERY' ? "#6366F1" : colors.textSecondary} 
              />
              <Text style={[
                styles.typeToggleText, 
                { color: colors.textSecondary },
                orderType === 'DELIVERY' && [styles.typeTextActiveDelivery, isDark && { color: "#818CF8" }]
              ]}>
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
        ) : (!storeSettings?.enable_time_slots && orderType === 'PICKUP' ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardSectionLabel, { color: colors.text }]}>Pickup time</Text>
            <View style={styles.pickupTimeOptions}>
              {['As soon as possible', 'In 30 minutes', 'In 1 hour'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.pickupSlotPill,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    pickupTime === slot && [styles.pickupSlotPillActive, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.primary }]
                  ]}
                  onPress={() => setPickupTime(slot)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.pickupSlotText,
                    { color: colors.textSecondary },
                    pickupTime === slot && [styles.pickupSlotTextActive, isDark && { color: colors.primary }]
                  ]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.storeAddressHint, { color: colors.textSecondary }]}>
              Store Location: {storeSettings?.store_address || 'Main Road, Kirana Market'}
            </Text>
          </View>
        ) : null)}

        {/* Dynamic Delivery / Pickup Time Slots Selector */}
        {Boolean(storeSettings?.enable_time_slots) && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={[styles.cardSectionLabel, { color: colors.text, marginBottom: 2 }]}>
                  {orderType === 'DELIVERY' ? 'Delivery Time Slot' : 'Pickup Time Slot'}
                </Text>
                <Text style={[styles.slotSubtitle, { color: colors.textSecondary }]}>
                  {slotDay === 'TODAY' ? `Today (${todayFormatted})` : `Tomorrow (${tomorrowFormatted})`}
                </Text>
              </View>
              <Feather name="clock" size={18} color={colors.primary} />
            </View>

            {/* Today / Tomorrow Switcher Tabs */}
            <View style={[styles.slotDayTabs, { backgroundColor: colors.inputBg }]}>
              <TouchableOpacity
                style={[styles.slotDayTab, slotDay === 'TODAY' && [styles.slotDayTabActive, { backgroundColor: colors.surface }]]}
                onPress={() => {
                  setSlotDay('TODAY');
                  if (availableSlotsToday.length > 0) {
                    const stillValid = availableSlotsToday.find(s => s.label === selectedSlotLabel);
                    setSelectedSlotLabel(stillValid ? stillValid.label : availableSlotsToday[0].label);
                  } else {
                    setSelectedSlotLabel('');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.slotDayTabText, { color: colors.textSecondary }, slotDay === 'TODAY' && [styles.slotDayTabTextActive, { color: colors.primary }]]}>
                  Today ({todayFormatted})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.slotDayTab, slotDay === 'TOMORROW' && [styles.slotDayTabActive, { backgroundColor: colors.surface }]]}
                onPress={() => {
                  setSlotDay('TOMORROW');
                  if (!selectedSlotLabel && parsedSlotsList.length > 0) {
                    setSelectedSlotLabel(parsedSlotsList[0].label);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.slotDayTabText, { color: colors.textSecondary }, slotDay === 'TOMORROW' && [styles.slotDayTabTextActive, { color: colors.primary }]]}>
                  Tomorrow ({tomorrowFormatted})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Time Slot Grid */}
            <View style={styles.slotsGrid}>
              {slotDay === 'TODAY' && availableSlotsToday.length === 0 ? (
                <View style={styles.noSlotsBox}>
                  <Feather name="alert-circle" size={16} color="#B45309" />
                  <Text style={styles.noSlotsText}>
                    All slots for today are passed/closed (buffer: {bufferMins}m). Please select Tomorrow to schedule your order.
                  </Text>
                </View>
              ) : (
                parsedSlotsList.map((slot, idx) => {
                  const isPassed = slotDay === 'TODAY' && isSlotPassedToday(slot);
                  const isSelected = selectedSlotLabel === slot.label && !isPassed;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.slotCard,
                        { backgroundColor: colors.inputBg, borderColor: colors.border },
                        isSelected && [styles.slotCardSelected, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }],
                        isPassed && styles.slotCardPassed,
                      ]}
                      onPress={() => !isPassed && setSelectedSlotLabel(slot.label)}
                      disabled={isPassed}
                      activeOpacity={0.8}
                    >
                      <View style={styles.slotCardHeader}>
                        <Feather
                          name="clock"
                          size={13}
                          color={isPassed ? '#94A3B8' : isSelected ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.slotLabelText,
                            { color: colors.text },
                            isSelected && { color: colors.primary, fontWeight: '800' },
                            isPassed && styles.slotLabelPassed,
                          ]}
                        >
                          {slot.label}
                        </Text>
                      </View>
                      {isPassed && (
                        <View style={styles.closedBadge}>
                          <Text style={styles.closedBadgeText}>Closed</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {orderType === 'PICKUP' && (
              <Text style={[styles.storeAddressHint, { color: colors.textSecondary, marginTop: 10 }]}>
                Store Location: {storeSettings?.store_address || 'Main Road, Kirana Market'}
              </Text>
            )}
          </View>
        )}

        {/* Customer Instructions Note */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.text }]}>Note for the store (optional)</Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            placeholder="E.g., Please pack fragile items carefully..."
            placeholderTextColor={colors.textSecondary}
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Digital Wallet Card with Max Percentage Limit Enforcement */}
        {walletBalance > 0 && (
          <View style={[styles.walletCard, isDark && { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.walletLeft}>
              <View style={[styles.walletIconBox, isDark && { backgroundColor: colors.inputBg }]}>
                <MaterialIcons name="currency-rupee" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.walletTitle, { color: colors.text }]}>Use Wallet Balance</Text>
                <Text style={[styles.walletBalanceText, { color: colors.textSecondary }]}>Available: ₹{(walletBalance || 0).toFixed(2)}</Text>
                {maxWalletUsagePct < 100 && (
                  <Text style={styles.walletLimitText}>
                    Max {maxWalletUsagePct}% (₹{maxWalletAllowed.toFixed(2)}) usable on this order
                  </Text>
                )}
              </View>
            </View>
            <Switch
              value={useWallet}
              onValueChange={setUseWallet}
              trackColor={{ false: isDark ? '#334155' : '#CBD5E1', true: isDark ? '#065F46' : '#A7F3D0' }}
              thumbColor={useWallet ? colors.primary : (isDark ? '#94A3B8' : '#FFFFFF')}
            />
          </View>
        )}

        {/* Payment Method Selector Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardSectionLabel, { color: colors.text, marginBottom: 12 }]}>Payment Method</Text>

          {/* Option 1: Cash / Pay at Store */}
          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
              paymentMethod === 'COD' && [styles.paymentOptionSelected, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4' }]
            ]}
            onPress={() => setPaymentMethod('COD')}
            activeOpacity={0.8}
          >
            <View style={[styles.paymentRadioCircle, paymentMethod === 'COD' && { borderColor: colors.primary }]}>
              {paymentMethod === 'COD' && <View style={[styles.paymentRadioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentOptionHeader}>
                <Feather name="dollar-sign" size={16} color={paymentMethod === 'COD' ? colors.primary : colors.textSecondary} />
                <Text style={[styles.paymentOptionTitle, { color: colors.text }, paymentMethod === 'COD' && { fontWeight: '800' }]}>
                  {orderType === 'DELIVERY' ? 'Cash on Delivery' : 'Pay at Store (Cash/Card)'}
                </Text>
              </View>
              <Text style={[styles.paymentOptionDesc, { color: colors.textSecondary }]}>
                {orderType === 'DELIVERY' ? 'Pay cash to our delivery executive upon arrival' : 'Pay when you collect your items at the store counter'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Option 2: UPI (Instant Payment) */}
          <TouchableOpacity
            style={[
              styles.paymentOptionCard,
              { backgroundColor: colors.inputBg, borderColor: colors.border, marginTop: 10 },
              paymentMethod === 'UPI' && [styles.paymentOptionSelected, { borderColor: colors.primary, backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#F0FDF4' }]
            ]}
            onPress={() => setPaymentMethod('UPI')}
            activeOpacity={0.8}
          >
            <View style={[styles.paymentRadioCircle, paymentMethod === 'UPI' && { borderColor: colors.primary }]}>
              {paymentMethod === 'UPI' && <View style={[styles.paymentRadioInner, { backgroundColor: colors.primary }]} />}
            </View>
            <View style={styles.paymentOptionContent}>
              <View style={styles.paymentOptionHeader}>
                <Ionicons name="flash-outline" size={16} color="#4F46E5" />
                <Text style={[styles.paymentOptionTitle, { color: colors.text }, paymentMethod === 'UPI' && { fontWeight: '800' }]}>
                  UPI (Instant Payment)
                </Text>
                <View style={styles.upiBadge}>
                  <Text style={styles.upiBadgeText}>1-Click Native</Text>
                </View>
              </View>
              <Text style={[styles.paymentOptionDesc, { color: colors.textSecondary }]}>
                Google Pay, PhonePe, Paytm, BHIM & all UPI apps
              </Text>
            </View>
          </TouchableOpacity>

          {/* Order 100% Covered by Wallet Banner */}
          {finalTotalToPay === 0 && (
            <View style={[styles.walletFullyPaidBox, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', borderColor: '#10B981' }]}>
              <Feather name="check-circle" size={18} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#34D399' : '#047857' }}>
                  Order 100% Covered by Wallet
                </Text>
                <Text style={{ fontSize: 12, color: isDark ? '#A7F3D0' : '#065F46', marginTop: 2 }}>
                  No additional payment is required. You can place your order directly.
                </Text>
              </View>
            </View>
          )}

          {/* UPI Actions & Standee Details */}
          {paymentMethod === 'UPI' && finalTotalToPay > 0 && (
            <View style={[styles.upiContainer, { backgroundColor: isDark ? colors.surface : '#FFFFFF', borderColor: colors.border }]}>
              <View style={styles.upiNoticeBox}>
                <Feather name="info" size={14} color="#4F46E5" />
                <Text style={styles.upiNoticeText}>
                  Tap below to launch any installed UPI app on your phone, or scan the QR code.
                </Text>
              </View>

              {/* 1-Click Native UPI Intent Launch Button */}
              <TouchableOpacity
                style={styles.payUpiAppBtn}
                onPress={handlePayViaUpiApp}
                activeOpacity={0.85}
              >
                <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
                <Text style={styles.payUpiAppBtnText}>
                  Pay ₹{finalTotalToPay.toFixed(2)} with UPI App
                </Text>
              </TouchableOpacity>

              {/* Sub-actions Row: View QR & Copy UPI ID */}
              <View style={styles.upiSubActionsRow}>
                <TouchableOpacity
                  style={[styles.upiSecondaryBtn, { borderColor: colors.border }]}
                  onPress={() => setShowQrModal(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="maximize-2" size={14} color={colors.primary} />
                  <Text style={[styles.upiSecondaryBtnText, { color: colors.primary }]}>Show QR Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.upiSecondaryBtn, { borderColor: colors.border }]}
                  onPress={handleCopyUpiId}
                  activeOpacity={0.8}
                >
                  <Feather name={copiedUpi ? "check" : "copy"} size={14} color={copiedUpi ? "#059669" : colors.textSecondary} />
                  <Text style={[styles.upiSecondaryBtnText, { color: copiedUpi ? "#059669" : colors.textSecondary }]}>
                    {copiedUpi ? 'Copied!' : 'Copy UPI ID'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.upiIdDisplayBox, { backgroundColor: colors.inputBg }]}>
                <Text style={[styles.upiIdLabel, { color: colors.textSecondary }]}>Store VPA / UPI ID:</Text>
                <Text style={[styles.upiIdValue, { color: colors.text }]} selectable>{upiId}</Text>
              </View>

              {/* UTR / Transaction ID Input */}
              <View style={styles.utrInputSection}>
                <Text style={[styles.utrLabel, { color: colors.text }]}>
                  12-digit UTR / UPI Transaction Reference <Text style={{ color: '#DC2626' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.utrTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 324512345678"
                  placeholderTextColor={colors.textSecondary}
                  value={upiTransactionId}
                  onChangeText={setUpiTransactionId}
                  keyboardType="numeric"
                  maxLength={25}
                />
                <Text style={[styles.utrHint, { color: colors.textSecondary }]}>
                  Enter the 12-digit reference number from your UPI payment receipt.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Full Billing Summary Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Order Summary</Text>
          
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Item MRP Total</Text>
              <Text style={[styles.mrpStrikeText, { color: colors.textSecondary }]}>₹{mrpTotal.toFixed(2)}</Text>
            </View>
          )}

          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Product Savings</Text>
              <Text style={styles.savingsValue}>
                -₹{discount.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {discount > 0 ? 'Item Subtotal' : 'Subtotal'}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₹{itemsTotal.toFixed(2)}</Text>
          </View>

          {parseFloat(cart?.promo_discount || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Promo Discount</Text>
              <Text style={styles.savingsValue}>-₹{(parseFloat(cart?.promo_discount || '0') || 0).toFixed(2)}</Text>
            </View>
          )}

          {parseFloat(cart?.packaging_fee || '0') > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Packaging Fee</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>₹{(parseFloat(cart?.packaging_fee || '0') || 0).toFixed(2)}</Text>
            </View>
          )}

          {orderType === 'DELIVERY' && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Delivery Fee</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {deliveryFee === 0 ? <Text style={styles.freeText}>FREE</Text> : `₹${(deliveryFee || 0).toFixed(2)}`}
              </Text>
            </View>
          )}

          {useWallet && walletApplied > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.savingsLabel}>Wallet Applied</Text>
              <Text style={styles.savingsValue}>-₹{(walletApplied || 0).toFixed(2)}</Text>
            </View>
          )}

          {(discount > 0 || parseFloat(cart?.promo_discount || '0') > 0) && (
            <View style={[styles.savingsHighlightCard, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
              <Feather name="gift" size={14} color="#059669" />
              <Text style={styles.savingsHighlightText}>
                You are saving ₹{(discount + (parseFloat(cart?.promo_discount || '0') || 0)).toFixed(2)} on this order!
              </Text>
            </View>
          )}

          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total Due</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>₹{(finalTotalToPay || 0).toFixed(2)}</Text>
          </View>

          {/* Store status warnings inside summary */}
          {isStoreClosed ? (
            <View style={styles.summaryClosedBanner}>
              <Text style={styles.summaryClosedBannerText}>The store is currently closed. Cannot place order.</Text>
            </View>
          ) : isBelowMinOrder ? (
            <View style={styles.summaryMinOrderBanner}>
              <Text style={styles.summaryMinOrderBannerText}>Minimum order amount is ₹{(minOrderAmount || 0).toFixed(2)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky Bottom Place Order Bar */}
      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View>
          <Text style={[styles.bottomTotalLabel, { color: colors.textSecondary }]}>TOTAL AMOUNT</Text>
          <Text style={[styles.bottomTotalValue, { color: colors.text }]}>₹{(finalTotalToPay || 0).toFixed(2)}</Text>
        </View>

        <TouchableOpacity 
          style={[
            styles.placeOrderBtn,
            (isSubmitting || isStoreClosed || isEmergencyPaused || isBelowMinOrder || (orderType === 'DELIVERY' && (!selectedAddress || isBelowMinDelivery))) && styles.disabledPlaceOrderBtn
          ]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || isStoreClosed || isEmergencyPaused || isBelowMinOrder || (orderType === 'DELIVERY' && (!selectedAddress || isBelowMinDelivery))}
          activeOpacity={0.9}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.placeOrderBtnText}>{placeOrderBtnLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* UPI QR Code Standee Modal */}
      <Modal
        visible={showQrModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.qrModalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.qrModalHeader}>
              <View>
                <Text style={[styles.qrModalStoreName, { color: colors.text }]}>{payeeName}</Text>
                <Text style={[styles.qrModalSubtitle, { color: colors.textSecondary }]}>Scan with any UPI App</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQrModal(false)} style={styles.closeModalBtn}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrImageWrap}>
              <Image
                source={{ uri: qrImageUrl }}
                style={styles.qrModalImage}
                contentFit="contain"
              />
            </View>

            <View style={styles.qrModalAmountWrap}>
              <Text style={styles.qrModalAmountLabel}>Exact Amount to Pay</Text>
              <Text style={styles.qrModalAmountValue}>₹{finalTotalToPay.toFixed(2)}</Text>
            </View>

            <View style={[styles.qrUpiIdRow, { backgroundColor: colors.inputBg }]}>
              <Text style={[styles.qrUpiIdText, { color: colors.text }]} numberOfLines={1}>{upiId}</Text>
              <TouchableOpacity onPress={handleCopyUpiId} style={styles.qrCopyBtn}>
                <Feather name={copiedUpi ? "check" : "copy"} size={14} color="#FFFFFF" />
                <Text style={styles.qrCopyBtnText}>{copiedUpi ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.doneQrBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowQrModal(false)}
            >
              <Text style={styles.doneQrBtnText}>Done / Back to Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
    fontSize: 13,
    color: '#0F172A',
  },
  formTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 8,
  },
  saveAddressBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 13,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  saveAddressBtnDisabled: {
    opacity: 0.6,
  },
  saveAddressBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
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
  mrpStrikeText: {
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  savingsHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  savingsHighlightText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    flex: 1,
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
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 6,
  },
  bottomTotalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },
  placeOrderBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyPauseBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  emergencyPauseIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  emergencyPauseTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  emergencyPauseText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#B45309',
    fontWeight: '500',
  },
  slotSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  slotDayTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginVertical: 12,
  },
  slotDayTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDayTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  slotDayTabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slotDayTabTextActive: {
    fontWeight: '800',
  },
  slotsGrid: {
    gap: 8,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  slotCardSelected: {
    borderWidth: 1.5,
  },
  slotCardPassed: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  slotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotLabelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  slotLabelPassed: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  closedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  closedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  noSlotsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noSlotsText: {
    flex: 1,
    fontSize: 12,
    color: '#B45309',
    fontWeight: '600',
  },
  walletLimitText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  paymentOptionSelected: {
    borderWidth: 1.5,
  },
  paymentRadioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  paymentRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentOptionContent: {
    flex: 1,
  },
  paymentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  paymentOptionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  upiBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  upiBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4F46E5',
    textTransform: 'uppercase',
  },
  upiContainer: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  upiNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 10,
  },
  upiNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#4338CA',
    lineHeight: 16,
  },
  payUpiAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  payUpiAppBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  upiSubActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  upiSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  upiSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  upiIdDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upiIdLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  upiIdValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  utrInputSection: {
    gap: 6,
    marginTop: 4,
  },
  utrLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  utrTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  utrHint: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  qrModalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrModalStoreName: {
    fontSize: 16,
    fontWeight: '900',
  },
  qrModalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 6,
  },
  qrImageWrap: {
    width: 220,
    height: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  qrModalImage: {
    width: '100%',
    height: '100%',
  },
  qrModalAmountWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  qrModalAmountLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  qrModalAmountValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  qrUpiIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  qrUpiIdText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  qrCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrCopyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  doneQrBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneQrBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  walletFullyPaidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 10,
  },
});
