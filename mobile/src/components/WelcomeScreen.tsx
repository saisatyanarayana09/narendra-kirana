import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity, 
  Image,
  Modal
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  getHasShownWelcomeSession, 
  setHasShownWelcomeSession, 
  resetWelcomeSession 
} from '../utils/welcomeSession';
import { LinearGradient } from 'expo-linear-gradient';

export { resetWelcomeSession };


interface WelcomeScreenProps {
  forceShow?: boolean;
  onStart?: () => void;
  onFinish?: () => void;
}

export function WelcomeScreen({ forceShow = false, onStart, onFinish }: WelcomeScreenProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const mainFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.85)).current;
  const logoTranslateYAnim = useRef(new Animated.Value(24)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  
  const brandFadeAnim = useRef(new Animated.Value(0)).current;
  const greetingFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (forceShow || (user && !getHasShownWelcomeSession())) {
      setHasShownWelcomeSession(true);
      setVisible(true);
      if (onStart) onStart();

      // Fade in background immediately
      Animated.timing(mainFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Staggered entrance
      Animated.stagger(150, [
        Animated.parallel([
          Animated.spring(logoScaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
          Animated.spring(logoTranslateYAnim, { toValue: 0, tension: 50, friction: 7, useNativeDriver: true }),
          Animated.timing(logoFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.timing(brandFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(greetingFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [user, forceShow]);

  const dismiss = () => {
    Animated.timing(mainFadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  };

  if (!visible) return null;

  const hour = new Date().getHours();
  let greeting = 'Welcome';
  if (hour >= 5 && hour < 12) {
    greeting = 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    greeting = 'Good evening';
  }

  const { colors, isDark } = useTheme();
  const name = user?.first_name || user?.username || 'Customer';

  return (
    <Modal transparent statusBarTranslucent visible={visible} animationType="none" onRequestClose={dismiss}>
      <Animated.View 
        style={[
          styles.overlay, 
          { opacity: mainFadeAnim }
        ]}
      >
        <LinearGradient 
          colors={isDark ? ['#090D16', '#0C1220', '#064E3B'] : ['#FFFFFF', '#F0FDF4', '#ECFDF5']} 
          start={{ x: 0.5, y: 0 }} 
          end={{ x: 0.5, y: 1 }} 
          style={StyleSheet.absoluteFill} 
        />
        
        {/* Ambient Decoration */}
        <View style={[styles.circle1, isDark && { borderColor: 'rgba(52, 211, 153, 0.1)' }]} />
        <View style={[styles.circle2, isDark && { borderColor: 'rgba(52, 211, 153, 0.12)' }]} />
        <View style={[styles.circle3, isDark && { backgroundColor: 'rgba(52, 211, 153, 0.06)' }]} />

        <TouchableOpacity 
          style={styles.touchContainer} 
          activeOpacity={1} 
          onPress={dismiss}
        >
          <View style={styles.contentContainer}>
            <Animated.View 
              style={{
                opacity: logoFadeAnim,
                transform: [
                  { scale: logoScaleAnim },
                  { translateY: logoTranslateYAnim }
                ],
                alignItems: 'center'
              }}
            >
              <View style={[styles.logoWrapper, isDark && { backgroundColor: colors.surface }]}>
                <Image 
                  source={require('../../assets/logo.jpg')} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            <Animated.View style={[styles.brandRow, { opacity: brandFadeAnim }]}>
              <Text style={[styles.brandEmerald, isDark && { color: '#34D399' }]}>NARENDRA </Text>
              <Text style={[styles.brandPrimary, isDark && { color: colors.primary }]}>KIRANA</Text>
            </Animated.View>

            <Animated.View style={{ opacity: greetingFadeAnim }}>
              <Text style={[styles.greetingHeadline, isDark && { color: '#F8FAFC' }]}>
                {greeting},{'\n'}{name}.
              </Text>
            </Animated.View>
          </View>
          
          <Text style={[styles.dismissHint, isDark && { color: 'rgba(148, 163, 184, 0.6)' }]}>Tap anywhere to continue</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle1: {
    position: 'absolute',
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.06)',
  },
  circle2: {
    position: 'absolute',
    alignSelf: 'center',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.08)',
  },
  circle3: {
    position: 'absolute',
    alignSelf: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
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
    width: 130,
    height: 130,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    overflow: 'hidden',
  },
  logoImage: {
    width: 118,
    height: 118,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandEmerald: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  brandPrimary: {
    fontSize: 15,
    fontWeight: '900',
    color: '#16A34A',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  greetingHeadline: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 44,
    paddingHorizontal: 16,
  },
  dismissHint: {
    position: 'absolute',
    bottom: 60,
    fontSize: 12,
    color: 'rgba(100, 116, 139, 0.4)',
    fontWeight: '500',
  },
});
