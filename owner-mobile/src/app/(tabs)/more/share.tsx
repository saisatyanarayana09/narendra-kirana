import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import api from '../../../../services/api';

export default function ShareAppsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useAppTheme();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    api.get('/store/settings/')
      .then((res: any) => setSettings(res.data))
      .catch(() => {});
  }, []);

  const handleCopy = async (url: string, name: string) => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied!', `${name} link has been copied to clipboard.`);
    } catch {
      // ignore
    }
  };

  const handleShare = async (url: string, name: string) => {
    try {
      await Share.share({
        message: `Download the ${name} here: ${url}`,
        title: `Download ${name}`,
      });
    } catch {
      // ignore
    }
  };

  const apps = [
    {
      name: 'Customer App',
      description: 'For your buyers to order groceries.',
      url: settings?.app_update_url || 'https://narendra-kirana.vercel.app/download-apk/customer',
      icon: 'basket-outline' as const,
      color: '#10b981',
    },
    {
      name: 'Delivery App',
      description: 'For your delivery partners.',
      url: settings?.delivery_app_update_url || 'https://narendra-kirana.vercel.app/download-apk/delivery',
      icon: 'bicycle-outline' as const,
      color: '#6366f1',
    },
    {
      name: 'Owner App',
      description: 'For store management.',
      url: settings?.owner_app_update_url || 'https://narendra-kirana.vercel.app/download-apk/owner',
      icon: 'storefront-outline' as const,
      color: '#f59e0b',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Share Apps</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Share these links with your customers and staff to download the apps directly.
        </Text>

        {apps.map((app) => (
          <View key={app.name} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: `${app.color}15` }]}>
                <Ionicons name={app.icon} size={24} color={app.color} />
              </View>
              <View style={styles.cardTexts}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{app.name}</Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{app.description}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${app.color}15` }]}
                onPress={() => handleCopy(app.url, app.name)}
              >
                <Ionicons name="copy-outline" size={18} color={app.color} />
                <Text style={[styles.actionText, { color: app.color }]}>Copy Link</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: app.color }]}
                onPress={() => handleShare(app.url, app.name)}
              >
                <Ionicons name="share-social-outline" size={18} color="#fff" />
                <Text style={[styles.actionText, { color: '#fff' }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backBtn: {},
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTexts: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  cardDesc: { fontSize: 13 },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
