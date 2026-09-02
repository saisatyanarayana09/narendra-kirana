import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { triggerHaptic } from '../utils/haptics';

interface FloatingCartBarProps {
  bottomOffset: number;
  onPress: () => void;
  onClose: () => void;
  currentRouteName?: string;
}

const HIDE_ON_SCREENS = [
  'ProductDetailScreen',
  'CheckoutScreen',
  'OrderSuccessScreen',
  'OrderTrackingScreen',
  'InvoiceScreen',
  'AddAddressScreen',
  'CartScreen',
  'CartTab',
];

export function FloatingCartBar({ bottomOffset, onPress, onClose, currentRouteName }: FloatingCartBarProps) {
  const { cart, storeSettings } = useCart();
  const slideAnim = useRef(new Animated.Value(80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const items = cart?.items || [];
  const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  
  // Calculate total price accurately
  const rawSubtotal = items.reduce((sum: number, item: any) => {
    const p = item.product || {};
    const price = parseFloat(p.offer_price || p.price || p.regular_price || 0);
    return sum + (price * (item.quantity || 1));
  }, 0);

  const totalAmount = parseFloat(cart?.total || cart?.subtotal || String(rawSubtotal)) || rawSubtotal;
  const freeThreshold = parseFloat(storeSettings?.free_delivery_threshold || '0');
  const isFreeDelivery = freeThreshold > 0 && totalAmount >= freeThreshold;
  const shortfall = freeThreshold > 0 && !isFreeDelivery ? freeThreshold - totalAmount : 0;

  useEffect(() => {
    if (itemCount > 0) {
      // Reset slide and opacity
      slideAnim.setValue(80);
      opacityAnim.setValue(0);

      // Smooth spring entrance
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Gentle pulse to draw eye to the cart update
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Subtle 10-second countdown indicator
      countdownAnim.setValue(1);
      Animated.timing(countdownAnim, {
        toValue: 0,
        duration: 10000,
        useNativeDriver: false,
      }).start();

      // Automatically auto-close after 10 seconds of no action
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, 10000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [itemCount]);

  if (itemCount === 0 || (currentRouteName && HIDE_ON_SCREENS.includes(currentRouteName))) {
    return null;
  }

  const handleOpenCart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerHaptic('selection');
    onPress();
  };

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerHaptic('light');
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          opacity: opacityAnim,
          transform: [
            { translateY: slideAnim },
            { scale: pulseAnim }
          ],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.94}
        onPress={handleOpenCart}
        style={styles.touchableCard}
      >
        <LinearGradient
          colors={['#065F46', '#047857', '#064E3B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.container}
        >
          {/* Subtle 10s Auto-Close Progress Bar */}
          <View style={styles.progressBarBackground}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  width: countdownAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }) 
                }
              ]} 
            />
          </View>

          {/* Micro Progress / Notification Banner */}
          <View style={styles.topRibbon}>
            <View style={styles.ribbonLeft}>
              {isFreeDelivery ? (
                <>
                  <Text style={styles.ribbonEmoji}>🎉</Text>
                  <Text style={styles.ribbonTextHighlight} numberOfLines={1} ellipsizeMode="tail">
                    FREE Delivery Unlocked!
                  </Text>
                </>
              ) : shortfall > 0 ? (
                <>
                  <Text style={styles.ribbonEmoji}>🚚</Text>
                  <Text style={styles.ribbonText} numberOfLines={1} ellipsizeMode="tail">
                    Add <Text style={styles.ribbonBold}>₹{shortfall.toFixed(0)}</Text> more for <Text style={styles.ribbonBold}>FREE Delivery</Text>
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.ribbonEmoji}>⚡</Text>
                  <Text style={styles.ribbonTextHighlight} numberOfLines={1} ellipsizeMode="tail">
                    Express Store Delivery (15-25 mins)
                  </Text>
                </>
              )}
            </View>

            {/* Close Button to Hide / Dismiss */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleDismiss}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Main Action Strip */}
          <View style={styles.mainStrip}>
            {/* Left: Cart Icon with Badge and Price */}
            <View style={styles.leftGroup}>
              <View style={styles.cartIconCircle}>
                <Feather name="shopping-bag" size={18} color="#064E3B" />
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              </View>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>
                    {`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </Text>
                </View>
                <Text style={styles.itemsSubtext}>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in basket
                </Text>
              </View>
            </View>

            {/* Right: Prominent White Action Button */}
            <View style={styles.viewCartButton}>
              <Text style={styles.viewCartText}>View Cart</Text>
              <Feather name="arrow-right" size={15} color="#064E3B" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 20,
  },
  touchableCard: {
    borderRadius: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 16,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#34D399', // Bright emerald highlighted glow
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    overflow: 'hidden',
  },
  progressBarBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    zIndex: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#34D399',
  },
  topRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  ribbonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  ribbonEmoji: {
    fontSize: 12,
  },
  ribbonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  ribbonBold: {
    color: '#FDE047', // Warm gold highlight
    fontWeight: '800',
  },
  ribbonTextHighlight: {
    color: '#6EE7B7', // Luminous mint green
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  closeButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  mainStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#064E3B',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  itemsSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  viewCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF', // High-contrast crisp white button
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  viewCartText: {
    color: '#064E3B', // Bold emerald matching brand
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
});
