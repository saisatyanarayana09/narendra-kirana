import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  TouchableOpacity, 
  Image 
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Session tracker so it only shows once per app session matching web app sessionStorage
let hasShownWelcomeSession = false;

export function resetWelcomeSession() {
  hasShownWelcomeSession = false;
}

interface WelcomeScreenProps {
  forceShow?: boolean;
  onFinish?: () => void;
}

export function WelcomeScreen({ forceShow = false, onFinish }: WelcomeScreenProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const translateYAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    // Only show when forced or when user is authenticated and hasn't seen welcome in this session
    if (forceShow || (user && !hasShownWelcomeSession)) {
      hasShownWelcomeSession = true;
      setVisible(true);

      // 1. Fade in & subtle scale up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Stay visible for 2.4s, then fade out smoothly
      const timer = setTimeout(() => {
        dismiss();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [user, forceShow]);

  const dismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  };

  if (!visible) return null;

  // Calculate dynamic time of day greeting matching web customer-layout.jsx
  const hour = new Date().getHours();
  let greeting = 'Welcome';
  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good evening';
  }

  const name = user?.first_name || user?.username || 'Customer';

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { opacity: fadeAnim }
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity 
        style={styles.touchContainer} 
        activeOpacity={1} 
        onPress={dismiss}
      >
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              transform: [
                { scale: scaleAnim },
                { translateY: translateYAnim }
              ]
            }
          ]}
        >
          {/* Logo matching web app */}
          <View style={styles.logoWrapper}>
            <Image 
              source={require('../../assets/logo.jpg')} 
              style={styles.logoImage} 
              resizeMode="contain"
            />
          </View>

          {/* Store Brand Name matching customer-layout.jsx:216-218 */}
          <View style={styles.brandRow}>
            <Text style={styles.brandEmerald}>NARENDRA </Text>
            <Text style={styles.brandPrimary}>KIRANA</Text>
          </View>

          {/* Dynamic Greeting matching customer-layout.jsx:220-222 */}
          <Text style={styles.greetingHeadline}>
            {greeting},{'\n'}{name}.
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width,
    height: height,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandEmerald: {
    fontSize: 13,
    fontWeight: '900',
    color: '#064E3B', // emerald-900
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandPrimary: {
    fontSize: 13,
    fontWeight: '900',
    color: '#16A34A', // primary-600
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  greetingHeadline: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A', // text-slate-900 matching web
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 40,
    paddingHorizontal: 16,
  },
});
