import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { triggerHaptic } from '../utils/haptics';

interface FloatingCartBarProps {
  bottomOffset: number;
  onPress: () => void;
}

export function FloatingCartBar({ bottomOffset, onPress }: FloatingCartBarProps) {
  const { cart } = useCart();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const items = cart?.items || [];
  const itemCount = items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
  const rawSubtotal = items.reduce((sum: number, item: any) => {
    const p = item.product || {};
    const price = parseFloat(p.offer_price || p.price || p.regular_price || 0);
    return sum + (price * (item.quantity || 1));
  }, 0);

  useEffect(() => {
    if (itemCount > 0) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 60,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [itemCount]);

  if (itemCount === 0) return null;

  const handlePress = () => {
    triggerHaptic('selection');
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        activeOpacity={0.92}
      >
        <View style={styles.leftSection}>
          <View style={styles.cartIconCircle}>
            <Feather name="shopping-bag" size={18} color="#064E3B" />
            <View style={styles.badgeCount}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          </View>
          <View style={styles.priceInfo}>
            <View style={styles.priceRow}>
              <MaterialIcons name="currency-rupee" size={16} color="#FFFFFF" />
              <Text style={styles.priceText}>{rawSubtotal.toFixed(0)}</Text>
            </View>
            <Text style={styles.subText}>{itemCount} {itemCount === 1 ? 'item' : 'items'} in cart</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999,
  },
  container: {
    backgroundColor: '#064E3B', // Emerald-900 matching web brand
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#A7F3D0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
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
  priceInfo: {
    justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  viewCartText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
