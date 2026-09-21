import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  BackHandler, 
  Animated, 
  Easing,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { triggerHaptic } from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type Props = { 
  navigation: AppNavigationProp; 
  route: any; 
};

export function OrderSuccessScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { orderId } = route.params || {};
  const isNavigatingRef = useRef(false);

  // Celebration pop animation
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const haloAnim = useRef(new Animated.Value(0.8)).current;
  const haloOpacity = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const formattedOrderId = orderId ? (String(orderId).startsWith('#') ? orderId : `#${orderId}`) : '';

  // Clean navigation helper: resets CartStack so CartScreen is always root, then navigates to target
  const handleCleanExit = (targetAction: () => void) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;

    // Reset CartStack back to CartScreen so CartTab never gets stuck showing OrderSuccess
    try {
      navigation.reset({
        index: 0,
        routes: [{ name: 'CartScreen' }],
      });
    } catch (e) {
      console.log('CartStack reset fallback:', e);
    }

    targetAction();
  };

  const handleGoHome = () => {
    triggerHaptic('selection');
    handleCleanExit(() => {
      navigation.getParent()?.navigate('HomeTab');
    });
  };

  const handleTrackOrder = () => {
    triggerHaptic('selection');
    handleCleanExit(() => {
      if (orderId) {
        navigation.getParent()?.navigate('OrdersTab', {
          screen: 'OrderTrackingScreen',
          params: { orderId },
        });
      } else {
        navigation.getParent()?.navigate('OrdersTab', {
          screen: 'OrderHistoryScreen',
        });
      }
    });
  };

  // Trigger celebration animation and sound/haptics on mount
  useEffect(() => {
    triggerHaptic('success');

    // 1. Icon Pop Spring
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 6,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();

    // 2. Halo Pulse Looping
    Animated.loop(
      Animated.parallel([
        Animated.timing(haloAnim, {
          toValue: 1.5,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    ).start();

    // 3. Card Fade & Slide In
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, []);

  // Hardware Back Button intercepts and redirects cleanly to Home
  useEffect(() => {
    const onBackPress = () => {
      handleGoHome();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Animated Celebration Badge */}
        <View style={styles.haloWrapper}>
          {/* Pulsing Radiance Ring */}
          <Animated.View 
            style={[
              styles.haloRing, 
              { 
                transform: [{ scale: haloAnim }],
                opacity: haloOpacity,
              }
            ]} 
          />

          {/* Spring Checkmark Circle */}
          <Animated.View 
            style={[
              styles.iconContainer, 
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <Feather name="check" size={50} color="#FFFFFF" />
          </Animated.View>

          {/* Floating celebratory particles */}
          <View style={styles.floatingEmojiLeft}>
            <Text style={{ fontSize: 24 }}>🎉</Text>
          </View>
          <View style={styles.floatingEmojiRight}>
            <Text style={{ fontSize: 22 }}>🛍️</Text>
          </View>
          <View style={styles.floatingEmojiBottom}>
            <Text style={{ fontSize: 20 }}>✨</Text>
          </View>
        </View>
        
        {/* Animated Headline & Subtitle */}
        <Animated.View style={[styles.textWrapper, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={[styles.title, { color: colors.text }]}>Order Confirmed!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your grocery order <Text style={[styles.orderIdBold, { color: colors.text }]}>{formattedOrderId}</Text> has been received and is being packed fresh with care!
          </Text>

          {/* Action Buttons */}
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleTrackOrder}
            activeOpacity={0.88}
          >
            <Feather name="package" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Track Order Live</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGoHome}
            activeOpacity={0.88}
          >
            <Feather name="shopping-bag" size={16} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Continue Shopping</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  haloWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  haloRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(16, 185, 129, 0.25)', // emerald-500 glow
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#059669', // Emerald-600
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 8px 12px rgba(5, 150, 105, 0.35)',
    elevation: 10,
    borderWidth: 3,
    borderColor: '#A7F3D0',
  },
  floatingEmojiLeft: {
    position: 'absolute',
    top: -8,
    left: -12,
  },
  floatingEmojiRight: {
    position: 'absolute',
    top: 4,
    right: -16,
  },
  floatingEmojiBottom: {
    position: 'absolute',
    bottom: -6,
    right: 4,
  },
  textWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  orderIdBold: {
    color: '#0F172A',
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#059669',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    boxShadow: '0px 4px 6px rgba(5, 150, 105, 0.25)',
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default OrderSuccessScreen;

