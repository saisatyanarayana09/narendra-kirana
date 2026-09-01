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
  const [visible, setVisible] = useState(() => {
    if (forceShow) return true;
    if (!hasShownWelcomeSession) {
      return true;
    }
    return false;
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const translateYAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    if (!visible) return;

    hasShownWelcomeSession = true;

    // 1. Fade in & scale up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Stay for 2.2 seconds, then fade out smoothly
    const timer = setTimeout(() => {
      dismiss();
    }, 2400);

    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 600,
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

  const name = user?.first_name || user?.username || 'Guest';

  return (
    <Animated.View 
      style={[
        styles.overlay, 
        { opacity: fadeAnim }
      ]}
      pointerEvents={fadeAnim ? 'auto' : 'none'}
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

          {/* Store Brand Name */}
          <View style={styles.brandRow}>
            <Text style={styles.brandEmerald}>NARENDRA</Text>
            <Text style={styles.brandRed}> KIRANA</Text>
          </View>

          {/* Dynamic Greeting matching web app */}
          <Text style={styles.greetingText}>
            {greeting},
          </Text>
          <Text style={styles.nameText}>
            {name}.
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
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandEmerald: {
    fontSize: 14,
    fontWeight: '900',
    color: '#064E3B', // emerald-900
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  brandRed: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626', // red-600
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  greetingText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0F172A', // slate-900
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  nameText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#059669', // emerald-600
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 2,
  },
});
