import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';

export function ProfileScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user, logout, refreshUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileData();
    });
    loadProfileData();
    return unsubscribe;
  }, [navigation]);

  const loadProfileData = async () => {
    try {
      refreshUser?.();
      const [walletRes, refRes] = await Promise.all([
        apiClient.get('/auth/wallet/').catch(() => ({ data: { balance: 0 } })),
        apiClient.get('/offers/referrals/').catch(() => ({ data: [] })),
      ]);
      setWalletBalance(parseFloat(walletRes.data?.balance || 0));
      const refs = Array.isArray(refRes.data) ? refRes.data : (refRes.data?.results || []);
      setReferralCount(refs.length);
    } catch {
      // Ignore background fetch error
    }
  };

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

  const getInitials = () => {
    if (user?.first_name) {
      const parts = user.first_name.trim().split(' ');
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.first_name.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return 'NK';
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
      onPress: () => navigation.navigate('FavoritesScreen') 
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
        {/* Top Header with Avatar & Greeting */}
        <View style={styles.headerSection}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
              <View style={styles.greetingBox}>
                <Text style={styles.greetingTitle}>Hi, {displayName}!</Text>
                <Text style={styles.greetingSubtitle}>Manage your account and track your orders.</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={15} color="#E11D48" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Loyalty & Quick Stats Strip */}
          <View style={styles.loyaltyCard}>
            <TouchableOpacity 
              style={styles.loyaltyItem}
              onPress={() => navigation.navigate('WalletScreen')}
              activeOpacity={0.8}
            >
              <View style={styles.loyaltyIconBadge}>
                <Feather name="dollar-sign" size={14} color="#059669" />
              </View>
              <Text style={styles.loyaltyValue}>₹{walletBalance.toFixed(2)}</Text>
              <Text style={styles.loyaltyLabel}>Wallet Balance</Text>
            </TouchableOpacity>

            <View style={styles.loyaltyDivider} />

            <TouchableOpacity 
              style={styles.loyaltyItem}
              onPress={() => navigation.navigate('ReferAndEarnScreen')}
              activeOpacity={0.8}
            >
              <View style={[styles.loyaltyIconBadge, { backgroundColor: '#F0FDFA' }]}>
                <Feather name="users" size={14} color="#0D9488" />
              </View>
              <Text style={[styles.loyaltyValue, { color: '#0D9488' }]}>{referralCount}</Text>
              <Text style={styles.loyaltyLabel}>Referrals Made</Text>
            </TouchableOpacity>

            <View style={styles.loyaltyDivider} />

            <View style={styles.loyaltyItem}>
              <View style={[styles.loyaltyIconBadge, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="award" size={14} color="#D97706" />
              </View>
              <Text style={[styles.loyaltyValue, { color: '#D97706' }]}>Member</Text>
              <Text style={styles.loyaltyLabel}>Smart Club</Text>
            </View>
          </View>
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

          {/* Quick Action Logout Tile */}
          <TouchableOpacity 
            style={[styles.cardItem, styles.logoutCardItem]}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <View style={styles.cardTopRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFF1F2' }]}>
                <Feather name="log-out" size={24} color="#E11D48" />
              </View>
              <View style={styles.chevronCircle}>
                <Feather name="chevron-right" size={16} color="#E11D48" />
              </View>
            </View>

            <View style={styles.cardBottom}>
              <Text style={[styles.cardTitle, { color: '#E11D48' }]}>Sign Out</Text>
              <Text style={styles.cardDesc}>Log out safely from this device</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Narendra Kirana App v1.0.0</Text>
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
    marginTop: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  greetingBox: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A', // slate-900
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#64748B', // slate-500
    marginTop: 2,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF1F2', // rose-50
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  signOutText: {
    color: '#E11D48', // rose-600
    fontSize: 12,
    fontWeight: '700',
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
  },
  loyaltyItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  loyaltyIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  loyaltyValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  loyaltyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  loyaltyDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F1F5F9',
  },
  cardsGrid: {
    gap: 12,
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
  logoutCardItem: {
    borderColor: '#FFE4E6',
    backgroundColor: '#FFFDFD',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
