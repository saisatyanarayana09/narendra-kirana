import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  BackHandler, 
  Animated, 
  Easing 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { triggerHaptic } from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';

type Props = { 
  navigation: AppNavigationProp; 
  route: any; 
};

export function OrderSuccessScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { orderId } = route.params || {};
  const [countdown, setCountdown] = useState(7);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef(false);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const haloAnim = useRef(new Animated.Value(0.8)).current;
  const haloOpacity = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const formattedOrderId = orderId ? (String(orderId).startsWith('#') ? orderId : `#${orderId}`) : '';

  const clearRedirectTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    progressAnim.stopAnimation();
  };

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
    clearRedirectTimer();
    triggerHaptic('selection');
    handleCleanExit(() => {
      navigation.getParent()?.navigate('HomeTab');
    });
  };

  const handleTrackOrder = () => {
    clearRedirectTimer();
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

  const handleViewOrderDetails = () => {
    clearRedirectTimer();
    triggerHaptic('selection');
    handleCleanExit(() => {
      navigation.navigate('OrderTrackingScreen', { orderId });
    });
  };

  const handleStayOnPage = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(0);
  };

  // Trigger celebration animation and sound/haptics on mount
  useEffect(() => {
    triggerHaptic('success');

    // 1. Icon Pop Spring
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 6,
      useNativeDriver: true,
    }).start();

    // 2. Halo Pulse Looping
    Animated.loop(
      Animated.parallel([
        Animated.timing(haloAnim, {
          toValue: 1.5,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Card Fade & Slide In
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. Progress bar filling over 7 seconds
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 7000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, []);

  // Countdown timer for automatic redirect to Home
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleGoHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
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

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

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

          {/* Auto-redirect indicator */}
          <View style={[styles.redirectCard, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.15)' : '#ECFDF5', borderColor: isDark ? 'rgba(5, 150, 105, 0.3)' : '#A7F3D0' }]}>
            <View style={styles.redirectInfoRow}>
              <Feather name="clock" size={14} color={colors.primary} />
              <Text style={[styles.redirectText, { color: colors.textSecondary }]}>
                Redirecting to Home in <Text style={[styles.countdownNumber, { color: colors.primary }]}>{countdown}s</Text>
              </Text>
              <Text style={[styles.redirectDot, { color: colors.textSecondary }]}>•</Text>
              <TouchableOpacity 
                onPress={handleStayOnPage}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.stayOnPageLink, { color: colors.primary }]}>Stay on this page</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.progressBarBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#A7F3D0' }]}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth, backgroundColor: colors.primary }]} />
            </View>
          </View>

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
            onPress={handleViewOrderDetails}
            activeOpacity={0.88}
          >
            <Feather name="file-text" size={16} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>View Order Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.homeLinkButton}
            onPress={handleGoHome}
            activeOpacity={0.88}
          >
            <Text style={[styles.homeLinkButtonText, { color: colors.textSecondary }]}>Go to Home Now →</Text>
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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
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
  redirectCard: {
    width: '100%',
    backgroundColor: '#ECFDF5', // emerald-50
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 16,
    padding: 14,
    marginBottom: 24,
  },
  redirectInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  redirectText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '700',
  },
  countdownNumber: {
    color: '#059669',
    fontWeight: '900',
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 2,
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
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  homeLinkButton: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeLinkButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  redirectDot: {
    color: '#A7F3D0',
    fontSize: 12,
  },
  stayOnPageLink: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

