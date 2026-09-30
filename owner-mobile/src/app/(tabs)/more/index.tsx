import React, { useState, useEffect, useMemo } from 'react';
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
import ScreenHeader from '../../../components/ScreenHeader';
import ModernSwitch from '../../../components/ModernSwitch';

interface SectionGroup {
  groupTitle: string;
  groupDesc: string;
  items: typeof OWNER_NAVIGATION;
}

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

  const navMap = useMemo(() => {
    const map = new Map<string, (typeof OWNER_NAVIGATION)[0]>();
    OWNER_NAVIGATION.forEach((item) => {
      map.set(item.route, item);
    });
    return map;
  }, []);

  const groups: SectionGroup[] = useMemo(() => {
    const getItem = (route: string) => navMap.get(route);

    return [
      {
        groupTitle: 'Daily Operations & Fleet',
        groupDesc: 'Order processing, driver dispatch & billing',
        items: [
          getItem('/(tabs)/orders'),
          getItem('/(tabs)/more/delivery'),
          getItem('/(tabs)/more/invoices'),
          getItem('/(tabs)/more/map'),
        ].filter(Boolean) as typeof OWNER_NAVIGATION,
      },
      {
        groupTitle: 'Catalog & Visual Storefront',
        groupDesc: 'Products, inventory stock & promotional aisles',
        items: [
          getItem('/(tabs)/products'),
          getItem('/(tabs)/more/categories'),
          getItem('/(tabs)/more/showcase'),
        ].filter(Boolean) as typeof OWNER_NAVIGATION,
      },
      {
        groupTitle: 'Marketing & Customer Growth',
        groupDesc: 'Coupons, push notifications, referrals & reviews',
        items: [
          getItem('/(tabs)/more/offers'),
          getItem('/(tabs)/more/broadcast'),
          getItem('/(tabs)/more/referrals'),
          getItem('/(tabs)/more/customers'),
          getItem('/(tabs)/more/feedback'),
        ].filter(Boolean) as typeof OWNER_NAVIGATION,
      },
      {
        groupTitle: 'Business Intelligence & Store Admin',
        groupDesc: 'Revenue analytics, store timings, UPI & system backup',
        items: [
          getItem('/(tabs)/more/reports'),
          getItem('/(tabs)/more/settings'),
          getItem('/(tabs)/more/advanced-settings'),
          getItem('/(tabs)/more/scanner'),
        ].filter(Boolean) as typeof OWNER_NAVIGATION,
      },
    ];
  }, [navMap]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Universal Screen Header */}
      <ScreenHeader
        title="Store Sections Hub"
        subtitle="All 16 management tools"
        showBack={false}
        rightAction={
          storeLoaded ? (
            <TouchableOpacity
              style={[
                styles.storeStatusPill,
                {
                  backgroundColor: storeOpen
                    ? isDark
                      ? 'rgba(16, 185, 129, 0.2)'
                      : '#ecfdf5'
                    : isDark
                      ? 'rgba(239, 68, 68, 0.2)'
                      : '#fff1f2',
                  borderColor: storeOpen ? '#10b981' : '#f43f5e',
                },
              ]}
              activeOpacity={0.8}
              onPress={handleToggleStore}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: storeOpen ? '#10b981' : '#f43f5e' },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: storeOpen ? '#10b981' : '#f43f5e' },
                ]}
              >
                {storeOpen ? 'Store Live' : 'Closed'}
              </Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
      >
        <View style={styles.maxContainer}>
          {/* Quick Controls Strip: Theme & Storefront Status */}
          <View
            style={[
              styles.controlsRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.controlLeft}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={18}
                color={isDark ? '#fbbf24' : '#f59e0b'}
              />
              <View>
                <Text style={[styles.controlTitle, { color: colors.text }]}>
                  Appearance Mode
                </Text>
                <Text style={[styles.controlSub, { color: colors.textMuted }]}>
                  {isDark ? 'Dark theme active' : 'Light theme active'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.themeToggleBtn, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
              onPress={toggleTheme}
            >
              <Text style={[styles.themeToggleBtnText, { color: colors.text }]}>
                Switch to {isDark ? 'Light' : 'Dark'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Categorized Tool Rails */}
          {groups.map((group) => (
            <View key={group.groupTitle} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Text style={[styles.groupTitleText, { color: colors.text }]}>
                  {group.groupTitle}
                </Text>
                <Text style={[styles.groupDescText, { color: colors.textMuted }]}>
                  {group.groupDesc}
                </Text>
              </View>

              <View style={styles.grid}>
                {group.items.map((item) => (
                  <TouchableOpacity
                    key={item.name}
                    style={[
                      styles.card,
                      {
                        width: isWide ? '48.5%' : '100%',
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => router.push(item.route as any)}
                  >
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                        <Ionicons name={item.icon} size={20} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.titleBadgeRow}>
                          <Text style={[styles.cardTitle, { color: colors.text }]}>
                            {item.name}
                          </Text>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: colors.cardAlt, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
                              {item.badge}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.desc}
                        </Text>
                      </View>
                    </View>

                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Logout Action */}
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={logout}
          >
            <Ionicons name="log-out-outline" size={18} color="#e11d48" />
            <Text style={styles.logoutText}>Log Out of Owner Portal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 36,
  },
  maxContainer: {
    width: '100%',
    maxWidth: 1000,
    alignSelf: 'center',
  },
  storeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  controlLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  controlSub: {
    fontSize: 11,
    marginTop: 1,
  },
  themeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  groupSection: {
    marginBottom: 20,
  },
  groupHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  groupTitleText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupDescText: {
    fontSize: 11,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutText: {
    color: '#e11d48',
    fontSize: 14,
    fontWeight: '700',
  },
});
