import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Store Logo */}
        <View style={styles.logoWrapper}>
          <Image 
            source={require('../../assets/logo.jpg')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>

        {/* Brand Name */}
        <Text style={styles.brandTitle}>
          <Text style={{ color: '#064E3B' }}>NARENDRA </Text>
          <Text style={{ color: '#16A34A' }}>KIRANA</Text>
        </Text>

        <Text style={styles.subtitle}>
          Fresh groceries & daily essentials delivered directly to your doorstep.
        </Text>

        {/* Value Proposition Bullets */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIconBadge, { backgroundColor: '#ECFDF5' }]}>
              <Feather name="zap" size={16} color="#059669" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Express Fast Delivery</Text>
              <Text style={styles.featureSubtitle}>Fresh items delivered in minutes</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIconBadge, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="check-circle" size={16} color="#2563EB" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>100% Fresh & Authentic</Text>
              <Text style={styles.featureSubtitle}>Handpicked quality groceries</Text>
            </View>
          </View>

          <View style={styles.featureRow}>
            <View style={[styles.featureIconBadge, { backgroundColor: '#FFFBEB' }]}>
              <Feather name="tag" size={16} color="#D97706" />
            </View>
            <View style={styles.featureTextWrap}>
              <Text style={styles.featureTitle}>Best Kirana Prices</Text>
              <Text style={styles.featureSubtitle}>Big savings on your daily basket</Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Signup')}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>Create an Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 100,
    height: 100,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 28,
    fontWeight: '500',
  },
  featuresContainer: {
    width: '100%',
    gap: 14,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  featureIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 28,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  primaryButton: {
    backgroundColor: '#059669', // Emerald-600
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
});

