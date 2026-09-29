import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { useAppTheme } from '../../../context/ThemeContext';
import { OWNER_NAVIGATION } from '../_layout';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';

export default function MoreScreen() {
  const { token, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useAppTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [storeOpen, setStoreOpen] = useState(true);
  const [storeLoaded, setStoreLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    api
      .get('/store/settings/')
      .then((res) => {
        if (!isMounted) return;
        const data = Array.isArray(res?.data) ? res.data[0] : res?.data;
        if (data && typeof data.is_open === 'boolean') {
          setStoreOpen(data.is_open);
        }
        setStoreLoaded(true);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleToggleStore = async () => {
    const nextState = !storeOpen;
    setStoreOpen(nextState);
    try {
      await api.patch('/store/settings/', { is_open: nextState });
    } catch {
      setStoreOpen(!nextState);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.maxContainer}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Store Sections Hub
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Quickly access and jump to any store management section
          </Text>
        </View>

        {/* Quick Controls Bar: Store Live & Theme Switcher */}
        <View
          style={[
            styles.controlsRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Store Live / Closed Button */}
          {storeLoaded && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleStore}
              style={[
                styles.storePill,
                storeOpen
                  ? isDark
                    ? styles.storeOpenDark
                    : styles.storeOpenLight
                  : isDark
                    ? styles.storeClosedDark
                    : styles.storeClosedLight,
              ]}
            >
              <View
                style={[
                  styles.storeDot,
                  { backgroundColor: storeOpen ? '#10b981' : '#f43f5e' },
                ]}
              />
              <View style={styles.storeInfo}>
                <Text
                  style={[
                    styles.storeTitle,
                    {
                      color: storeOpen
                        ? isDark
                          ? '#6ee7b7'
                          : '#047857'
                        : isDark
                          ? '#fda4af'
                          : '#be123c',
                    },
                  ]}
                >
                  {storeOpen ? 'Store Live' : 'Store Closed'}
                </Text>
                <Text style={[styles.storeSub, { color: colors.textMuted }]}>
                  {storeOpen ? 'Accepting Orders' : 'Offline'}
                </Text>
              </View>
              <Ionicons
                name="swap-horizontal"
                size={16}
                color={
                  storeOpen
                    ? isDark
                      ? '#6ee7b7'
                      : '#047857'
                    : isDark
                      ? '#fda4af'
                      : '#be123c'
                }
              />
            </TouchableOpacity>
          )}

          {/* Theme Toggle Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleTheme}
            style={[
              styles.themeBtn,
              {
                backgroundColor: colors.cardAlt,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? '#fbbf24' : '#4f46e5'}
            />
            <View style={styles.themeInfo}>
              <Text style={[styles.themeTitle, { color: colors.text }]}>
                {isDark ? 'Light' : 'Dark'} Mode
              </Text>
              <Text style={[styles.themeSub, { color: colors.textMuted }]}>
                Appearance
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {OWNER_NAVIGATION.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.card,
                {
                  width: isWide ? '31.5%' : '48%',
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.cardTop}>
                <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={18} color="#ffffff" />
                </View>
                <View style={[styles.badge, { backgroundColor: colors.cardAlt }]}>
                  <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                    {item.badge}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>
                {item.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={20} color="#e11d48" />
          <Text style={styles.logoutText}>Log Out of Owner Portal</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  maxContainer: {
    width: '100%',
    maxWidth: 1150,
    alignSelf: 'center',
  },
  header: {
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 13,
    marginTop: 4,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  storePill: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  storeOpenLight: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  storeOpenDark: {
    backgroundColor: 'rgba(6, 78, 59, 0.5)',
    borderColor: '#065f46',
  },
  storeClosedLight: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  storeClosedDark: {
    backgroundColor: 'rgba(136, 19, 55, 0.5)',
    borderColor: '#9f1239',
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  storeInfo: {
    flex: 1,
  },
  storeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  storeSub: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  themeBtn: {
    flex: 0.85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  themeSub: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  logoutText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '700',
  },
});
