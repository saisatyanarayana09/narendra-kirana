import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const cards = [
    { 
      name: 'Your Orders', 
      desc: 'Track, return, or buy things again', 
      icon: 'package' as const, 
      color: '#2563EB', // blue-600
      bg: '#EFF6FF',    // blue-50
      onPress: () => navigation.navigate('OrderHistoryScreen') 
    },
    { 
      name: 'Digital Wallet', 
      desc: 'Check your balance and transactions', 
      icon: 'dollar-sign' as const, 
      color: '#059669', // emerald-600
      bg: '#ECFDF5',    // emerald-50
      onPress: () => navigation.navigate('WalletScreen') 
    },
    { 
      name: 'Refer & Earn', 
      desc: 'Invite friends, earn real money!', 
      icon: 'gift' as const, 
      color: '#0D9488', // teal-600
      bg: '#F0FDFA',    // teal-50
      onPress: () => navigation.navigate('ReferAndEarnScreen') 
    },
    { 
      name: 'Account Settings', 
      desc: 'Manage password & personal details', 
      icon: 'user' as const, 
      color: '#059669', // primary-600
      bg: '#ECFDF5',    // primary-50
      onPress: () => navigation.navigate('AccountSettingsScreen') 
    },
    { 
      name: 'Saved Addresses', 
      desc: 'Edit addresses for quick checkout', 
      icon: 'map-pin' as const, 
      color: '#D97706', // amber-600
      bg: '#FFFBEB',    // amber-50
      onPress: () => navigation.navigate('AddressesScreen') 
    },
    { 
      name: 'Favorites', 
      desc: 'View your saved products', 
      icon: 'heart' as const, 
      color: '#E11D48', // rose-600
      bg: '#FFF1F2',    // rose-50
      onPress: () => navigation.navigate('FavoritesTab') 
    },
    { 
      name: 'Notifications', 
      desc: 'Offers and order updates', 
      icon: 'bell' as const, 
      color: '#4F46E5', // indigo-600
      bg: '#EEF2FF',    // indigo-50
      onPress: () => navigation.navigate('NotificationsScreen') 
    },
  ];

  const displayName = user?.first_name || user?.username || 'Customer';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header matching web DashboardHome */}
        <View style={styles.headerSection}>
          <View style={styles.greetingBox}>
            <Text style={styles.greetingTitle}>Hi, {displayName}!</Text>
            <Text style={styles.greetingSubtitle}>Manage your account and track your orders.</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={16} color="#E11D48" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Dashboard Cards Grid matching web app */}
        <View style={styles.cardsGrid}>
          {cards.map((card, idx) => (
            <TouchableOpacity 
              key={idx}
              style={styles.cardItem}
              onPress={card.onPress}
              activeOpacity={0.85}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconContainer, { backgroundColor: card.bg }]}>
                  <Feather name={card.icon} size={24} color={card.color} />
                </View>
                <View style={styles.chevronCircle}>
                  <Feather name="chevron-right" size={16} color="#94A3B8" />
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.cardTitle}>{card.name}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{card.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.versionText}>Smart Kirana App v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // slate-50 matching web
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  headerSection: {
    marginBottom: 20,
    marginTop: 8,
  },
  greetingBox: {
    marginBottom: 12,
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A', // slate-900
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#64748B', // slate-500
    marginTop: 4,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F2', // rose-50
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  signOutText: {
    color: '#E11D48', // rose-600
    fontSize: 13,
    fontWeight: '700',
  },
  cardsGrid: {
    gap: 14,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0', // slate-200
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottom: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A', // slate-900
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B', // slate-500
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 24,
    fontWeight: '600',
  },
});
