import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export function WelcomeScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();
  const logoAnim = useRef(new Animated.Value(0)).current;
  const brandAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;
  const pillsAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(brandAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(taglineAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(pillsAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.spring(buttonsAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
    ]).start();
  }, [logoAnim, brandAnim, taglineAnim, pillsAnim, buttonsAnim]);

  const wrapAnimated = (anim: Animated.Value, children: React.ReactNode) => (
    <Animated.View style={{ 
      opacity: anim, 
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      alignItems: 'center'
    }}>
      {children}
    </Animated.View>
  );

  const gradientColors = isDark 
    ? (['#0F172A', '#064E3B', '#022C22'] as const)
    : (['#FFFFFF', '#F0FDF4', '#ECFDF5'] as const);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }} 
          bounces={false} 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            
            {wrapAnimated(logoAnim, (
              <View style={styles.logoContainer}>
                <View style={[styles.glow, isDark && { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]} />
                <View style={styles.logoWrapper}>
                  <Image 
                    source={require('../../assets/logo-transparent.png')} 
                    style={styles.logoImage} 
                    resizeMode="contain"
                  />
                </View>
              </View>
            ))}

            {wrapAnimated(brandAnim, (
              <Text style={styles.brandTitle}>
                <Text style={{ color: isDark ? '#34D399' : '#064E3B' }}>NARENDRA </Text>
                <Text style={{ color: isDark ? '#10B981' : '#16A34A' }}>KIRANA</Text>
              </Text>
            ))}

            {wrapAnimated(taglineAnim, (
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Your neighborhood kirana store,{'\n'}now at your fingertips.
              </Text>
            ))}

            {wrapAnimated(pillsAnim, (
              <View style={styles.featuresContainer}>
                <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(5, 150, 105, 0.2)' : '#F0FDF4' }]}>
                  <Feather name="zap" size={14} color={colors.primary} />
                  <Text style={[styles.pillText, { color: isDark ? '#34D399' : '#064E3B' }]}>Express Delivery</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' }]}>
                  <Feather name="check-circle" size={14} color="#2563EB" />
                  <Text style={[styles.pillText, { color: isDark ? '#93C5FD' : '#1E3A8A' }]}>100% Fresh</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FFFBEB' }]}>
                  <Feather name="tag" size={14} color="#D97706" />
                  <Text style={[styles.pillText, { color: isDark ? '#FCD34D' : '#92400E' }]}>Best Prices</Text>
                </View>
              </View>
            ))}
          </View>
          
          <Animated.View style={[styles.footer, { 
            opacity: buttonsAnim, 
            transform: [{ translateY: buttonsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] 
          }]}>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                Already have an account? <Text style={{ color: colors.primary, fontWeight: '800' }}>Log in</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.guestButton}
              onPress={() => (navigation as any).navigate('Main')}
              activeOpacity={0.85}
            >
              <Text style={[styles.guestButtonText, { color: colors.textSecondary }]}>
                Continue as Guest  →
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: -4,
  },
  guestButtonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  glow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  logoWrapper: {
    width: 120,
    height: 120,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontWeight: '500',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    paddingBottom: 36,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
});

