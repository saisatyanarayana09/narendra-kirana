import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  title: string;
  icon: IoniconsName;
  route: string;
}

const MENU_ITEMS: MenuItem[] = [
  { title: 'Store Settings', icon: 'settings-outline', route: '/(tabs)/more/settings' },
  { title: 'Delivery Radius Map', icon: 'map-outline', route: '/(tabs)/more/map' },
  { title: 'Referral QR Scanner', icon: 'qr-code-outline', route: '/(tabs)/more/scanner' },
  { title: 'Push Broadcast', icon: 'megaphone-outline', route: '/(tabs)/more/broadcast' },
  { title: 'Sales Reports', icon: 'bar-chart-outline', route: '/(tabs)/more/reports' },
  { title: 'Delivery Partners', icon: 'bicycle-outline', route: '/(tabs)/more/delivery' },
];

export default function MoreScreen() {
  const { logout } = useAuth();
  const router = useRouter();

  const handlePress = useCallback((route: string) => {
    if (route) {
      router.push(route as any);
    }
  }, [router]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Menu</Text>
      </View>

      <View style={styles.menuGroup}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.lastItem]}
            onPress={() => handlePress(item.route)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={24} color="#cbd5e1" style={styles.icon} />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={24} color="#ef4444" style={styles.icon} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  menuGroup: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  menuItemText: {
    color: '#f8fafc',
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#334155',
    marginBottom: 40,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
