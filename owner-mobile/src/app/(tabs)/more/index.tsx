import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useAppTheme } from '../../../context/ThemeContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { isDark, colors, toggleTheme } = useAppTheme();
  const { user, logout } = useAuth();

  const MENU_ITEMS = [
    { title: 'Advanced Settings', icon: 'settings-outline', route: '/(tabs)/more/advanced-settings', color: '#64748b' },
    { title: 'Product Categories', icon: 'pricetags-outline', route: '/(tabs)/more/categories', color: '#06b6d4' },
    { title: 'Visual Showcase', icon: 'images-outline', route: '/(tabs)/more/showcase', color: '#ec4899' },
    { title: 'Delivery Fleet Map', icon: 'bicycle-outline', route: '/(tabs)/more/delivery', color: '#059669' },
    { title: 'Push Broadcast', icon: 'notifications-outline', route: '/(tabs)/more/broadcast', color: '#0d9488' },
    { title: 'Sales Reports', icon: 'trending-up-outline', route: '/(tabs)/more/reports', color: '#8b5cf6' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#020617' : '#f8fafc' }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <Ionicons name="person" size={40} color={isDark ? '#94a3b8' : '#64748b'} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{user?.username || 'Store Owner'}</Text>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email || 'admin@smartkirana.com'}</Text>
        </View>

        {/* Store Info */}
        <View style={[styles.section, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STORE SETTINGS</Text>
          </View>
          
          <TouchableOpacity style={styles.menuItem} onPress={toggleTheme}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(100, 116, 139, 0.1)' }]}>
              <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={isDark ? "#eab308" : "#64748b"} />
            </View>
            <Text style={[styles.menuText, { color: colors.text }]}>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
          </TouchableOpacity>

          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              style={[styles.menuItem, idx === MENU_ITEMS.length - 1 ? { borderBottomWidth: 0 } : {}]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <Text style={[styles.menuText, { color: colors.text }]}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: isDark ? '#450a0a' : '#fef2f2', borderColor: isDark ? '#7f1d1d' : '#fecaca' }]} 
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { alignItems: 'center', marginBottom: 30, marginTop: 40 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 14 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  sectionHeader: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.02)' },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '700' }
});
