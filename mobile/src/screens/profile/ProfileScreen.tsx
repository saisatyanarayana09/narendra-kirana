import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, MapPin, Wallet, Gift, Bell, Settings, LogOut, ChevronRight, Package 
} from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export function ProfileScreen({ navigation }: { navigation: NativeStackNavigationProp<any> }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            // AuthContext handles the redirect
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      title: 'My Orders',
      icon: <Package size={22} color={theme.colors.primary} />,
      onPress: () => navigation.navigate('OrderHistoryScreen'),
    },
    {
      title: 'Saved Addresses',
      icon: <MapPin size={22} color={theme.colors.primary} />,
      onPress: () => navigation.navigate('AddressesScreen'),
    },
    {
      title: 'My Wallet',
      icon: <Wallet size={22} color={theme.colors.primary} />,
      onPress: () => navigation.navigate('WalletScreen'),
    },
    {
      title: 'Refer & Earn',
      icon: <Gift size={22} color={theme.colors.primary} />,
      onPress: () => navigation.navigate('ReferAndEarnScreen'),
    },
    {
      title: 'Notifications',
      icon: <Bell size={22} color={theme.colors.primary} />,
      onPress: () => navigation.navigate('NotificationsScreen'),
    },
    {
      title: 'Account Settings',
      icon: <Settings size={22} color={theme.colors.primary} />,
      onPress: () => navigation.navigate('AccountSettingsScreen'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.first_name?.[0] || 'U'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.title} 
              style={[styles.menuItem, index === menuItems.length - 1 && styles.menuItemLast]}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.iconBox}>{item.icon}</View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primaryDark,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error + '50',
    marginBottom: theme.spacing.lg,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.xl,
  },
});
