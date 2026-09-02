import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNavigationProp } from '../../navigation/types';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { triggerHaptic } from '../../utils/haptics';

export function ProfileScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user, logout, refreshUser } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic('light');
    await loadProfileData();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    triggerHaptic('medium');
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
      isRupee: false,
      color: '#2563EB', // blue-600
      bg: '#EFF6FF',    // blue-50
      onPress: () => navigation.navigate('OrderHistoryScreen') 
    },
    { 
      name: 'Digital Wallet', 
      desc: 'Check your balance and transactions', 
      icon: 'currency-rupee' as const,
      isRupee: true, // Use Indian Rupee symbol
      color: '#059669', // emerald-600
      bg: '#ECFDF5',    // emerald-50
      onPress: () => navigation.navigate('WalletScreen') 
    },
    { 
      name: 'Refer & Earn', 
      desc: 'Invite friends, earn real money!', 
      icon: 'gift' as const,
      isRupee: false,
      color: '#0D9488', // teal-600
      bg: '#F0FDFA',    // teal-50
      onPress: () => navigation.navigate('ReferAndEarnScreen') 
    },
    { 
      name: 'Account Settings', 
      desc: 'Manage password & personal details', 
      icon: 'user' as const,
      isRupee: false,
      color: '#059669', // primary-600
      bg: '#ECFDF5',    // primary-50
      onPress: () => navigation.navigate('AccountSettingsScreen') 
    },
    { 
      name: 'Saved Addresses', 
      desc: 'Edit addresses for quick checkout', 
      icon: 'map-pin' as const,
      isRupee: false,
      color: '#D97706', // amber-600
      bg: '#FFFBEB',    // amber-50
      onPress: () => navigation.navigate('AddressesScreen') 
    },
    { 
      name: 'Favorites', 
      desc: 'View your saved products', 
      icon: 'heart' as const,
      isRupee: false,
      color: '#E11D48', // rose-600
      bg: '#FFF1F2',    // rose-50
      onPress: () => navigation.navigate('FavoritesScreen') 
    },
    { 
      name: 'Notifications', 
      desc: 'Offers and order updates', 
      icon: 'bell' as const,
      isRupee: false,
      color: '#4F46E5', // indigo-600
      bg: '#EEF2FF',    // indigo-50
      onPress: () => navigation.navigate('NotificationsScreen') 
    },
  ];

  const displayName = user?.first_name || user?.username || 'Customer';

  const handleCardPress = (card: typeof cards[0]) => {
    triggerHaptic('light');
    card.onPress();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#059669']}
            tintColor="#059669"
          />
        }
      >
        {/* Improved Customer Name Hero Background */}
        <LinearGradient
          colors={['#064E3B', '#065F46', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.customerHeroCard}
        >
          {/* Decorative Corner Glow */}
          <View style={styles.heroDecorativeCircle} pointerEvents="none" />

          {/* Back Button at Top Left (Replaces 'Verified Smart Customer') */}
          <TouchableOpacity 
            style={styles.heroBackButton}
            onPress={() => {
              triggerHaptic('light');
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('HomeTab');
              }
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.heroBackButtonText}>Back</Text>
          </TouchableOpacity>

          {/* Avatar & Customer Greeting */}
          <View style={styles.customerInfoRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.greetingBox}>
              <Text style={styles.greetingTitle}>Hi, {displayName}!</Text>
              <Text style={styles.greetingSubtitle} numberOfLines={1}>
                {user?.email || (user?.phone_number ? `+91 ${user.phone_number}` : 'Manage your account and track orders')}
              </Text>
            </View>
          </View>

          {/* Loyalty & Quick Stats Strip: 2 Balanced Interactive Tiles */}
          <View style={styles.loyaltyCard}>
            <TouchableOpacity 
              style={styles.loyaltyItem}
              onPress={() => {
                triggerHaptic('light');
                navigation.navigate('WalletScreen');
              }}
              activeOpacity={0.75}
            >
              <View style={styles.loyaltyIconBadge}>
                <MaterialIcons name="currency-rupee" size={16} color="#059669" />
              </View>
              <Text style={styles.loyaltyValue}>₹{walletBalance.toFixed(2)}</Text>
              <Text style={styles.loyaltyLabel}>Wallet Balance</Text>
            </TouchableOpacity>

            <View style={styles.loyaltyDivider} />

            <TouchableOpacity 
              style={styles.loyaltyItem}
              onPress={() => {
                triggerHaptic('light');
                navigation.navigate('ReferAndEarnScreen');
              }}
              activeOpacity={0.75}
            >
              <View style={[styles.loyaltyIconBadge, { backgroundColor: '#F0FDFA' }]}>
                <Feather name="gift" size={15} color="#0D9488" />
              </View>
              <Text style={[styles.loyaltyValue, { color: '#0D9488' }]}>{referralCount}</Text>
              <Text style={styles.loyaltyLabel}>Referrals Made</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Action Cards: Horizontal layout with text on right of symbol and decreased height */}
        <View style={styles.cardsGrid}>
          {cards.map((card, idx) => (
            <TouchableOpacity 
              key={idx}
              style={styles.cardItem}
              onPress={() => handleCardPress(card)}
              activeOpacity={0.75}
            >
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconContainer, { backgroundColor: card.bg }]}>
                  {card.isRupee ? (
                    <MaterialIcons name="currency-rupee" size={20} color={card.color} />
                  ) : (
                    <Feather name={card.icon as any} size={20} color={card.color} />
                  )}
                </View>
                <View style={styles.cardTextGroup}>
                  <Text style={styles.cardTitle}>{card.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={1}>{card.desc}</Text>
                </View>
              </View>

              <View style={styles.chevronCircle}>
                <Feather name="chevron-right" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
          ))}

          {/* Quick Action Logout Tile at the Bottom */}
          <TouchableOpacity 
            style={[styles.cardItem, styles.logoutCardItem]}
            onPress={handleLogout}
            activeOpacity={0.75}
          >
            <View style={styles.cardLeftGroup}>
              <View style={[styles.iconContainer, { backgroundColor: '#FFF1F2' }]}>
                <Feather name="log-out" size={20} color="#E11D48" />
              </View>
              <View style={styles.cardTextGroup}>
                <Text style={[styles.cardTitle, { color: '#E11D48' }]}>Sign Out</Text>
                <Text style={styles.cardDesc}>Log out safely from this device</Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Feather name="chevron-right" size={16} color="#E11D48" />
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
  customerHeroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#064E3B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  heroDecorativeCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroBackButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBackButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#065F46',
    fontSize: 19,
    fontWeight: '900',
  },
  greetingBox: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: 'rgba(236, 253, 245, 0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  loyaltyItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  loyaltyIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  loyaltyValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.3,
  },
  loyaltyLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
  },
  loyaltyDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
  },
  cardsGrid: {
    gap: 10,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 64,
  },
  logoutCardItem: {
    borderColor: '#FFE4E6',
    backgroundColor: '#FFFDFD',
    marginTop: 6,
  },
  loginCardItem: {
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    marginTop: 6,
  },
  cardLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextGroup: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 24,
    fontWeight: '600',
  },
});
