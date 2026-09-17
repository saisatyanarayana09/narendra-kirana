import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Platform,
  Dimensions,
  Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { triggerHaptic } from '../utils/haptics';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function FloatingCartBarComponent({ bottomOffset, onPress, onClose, currentRouteName }: FloatingCartBarProps) {
  const { cart, storeSettings } = useCart();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const badgeScaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { itemCount, totalAmount, isFreeDelivery, shortfall } = useMemo(() => {
    const items = cart?.items || [];
    const count = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
    const rawSub = items.reduce((sum: number, item: any) => {
      const itemSub = parseFloat(item.subtotal || 0);
      if (itemSub > 0) return sum + itemSub;
      const p = typeof item.product === 'object' && item.product !== null ? item.product : {};
      const price = parseFloat(item.unit_price || p.offer_price || p.price || p.regular_price || 0);
      return sum + (price * (item.quantity || 1));
    }, 0);
    const tot = parseFloat(cart?.items_total || cart?.total || String(rawSub)) || rawSub;
    const threshold = parseFloat(storeSettings?.free_delivery_threshold || '0');
    const free = threshold > 0 && tot >= threshold;
    const short = threshold > 0 && !free ? threshold - tot : 0;
    return { itemCount: count, totalAmount: tot, isFreeDelivery: free, shortfall: short };
  }, [cart, storeSettings]);

  const prevItemCountRef = useRef(itemCount);

  const handleOpenCart = useCallback(() => {
    triggerHaptic('selection');
    onPress();
  }, [onPress]);

  const handleDismiss = useCallback(() => {
    triggerHaptic('light');
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 80,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, slideAnim, opacityAnim]);

  // Smooth bounce animation and haptic feedback when itemCount increments (without dismissing)
  useEffect(() => {
    if (itemCount > 0) {
      if (prevItemCountRef.current === 0) {
        // Initial entrance from bottom
        slideAnim.setValue(80);
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
            tension: 70,
            friction: 9,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start();
      } else if (itemCount > prevItemCountRef.current) {
        // Item count increased: trigger smooth upward bounce on bar/badge and haptic feedback
        triggerHaptic('medium');
        Animated.parallel([
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -8,
              duration: 130,
              easing: Easing.out(Easing.quad),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.spring(bounceAnim, {
              toValue: 0,
              tension: 120,
              friction: 6,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
          Animated.sequence([
            Animated.timing(badgeScaleAnim, {
              toValue: 1.35,
              duration: 130,
              easing: Easing.out(Easing.quad),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.spring(badgeScaleAnim, {
              toValue: 1,
              tension: 140,
              friction: 5,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        ]).start();
      }
    }
    prevItemCountRef.current = itemCount;
  }, [itemCount, slideAnim, opacityAnim, bounceAnim, badgeScaleAnim]);

  // Animate slim Free Delivery progress line indicator
  useEffect(() => {
    const threshold = parseFloat(storeSettings?.free_delivery_threshold || '0');
    const targetRatio = threshold > 0 ? Math.min(1, Math.max(0, totalAmount / threshold)) : (threshold === 0 && totalAmount > 0 ? 1 : 0);
    Animated.timing(progressAnim, {
      toValue: targetRatio,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [totalAmount, storeSettings?.free_delivery_threshold, progressAnim]);

  if (itemCount === 0 || (currentRouteName && HIDE_ON_SCREENS.includes(currentRouteName))) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          opacity: opacityAnim,
          transform: [
            { translateY: Animated.add(slideAnim, bounceAnim) },
            { scale: pulseAnim }
          ],
        },
      ]}
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
          {/* Slim 2.5px Progress Indicator Line for Free Delivery */}
          <View style={styles.progressBarBackground}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                { 
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: isFreeDelivery ? '#10B981' : '#34D399',
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
                    Add <Text style={styles.ribbonBold}>₹{(Number(shortfall) || 0).toFixed(0)}</Text> more for <Text style={styles.ribbonBold}>FREE Delivery</Text>
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
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
                <Animated.View style={[styles.badgeCount, { transform: [{ scale: badgeScaleAnim }] }]}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </Animated.View>
              </View>

              <View style={styles.priceContainer}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceValue}>
                    {`₹${(Number(totalAmount) || 0).toFixed(2)}`}
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
    pointerEvents: 'box-none' as any,
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

export const FloatingCartBar = React.memo(FloatingCartBarComponent);
