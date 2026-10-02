import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
    useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs, Redirect, useRouter, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import api from '../../services/api';

interface NavSection {
  name: string;
  route: string;
  matchKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  desc: string;
  color: string;
  badge: string;
}

export const OWNER_NAVIGATION: NavSection[] = [
  {
    name: 'Dashboard',
    route: '/(tabs)',
    matchKey: 'index',
    icon: 'grid-outline',
    desc: 'Live stats & store overview',
    color: '#4f46e5',
    badge: 'Overview',
  },
  {
    name: 'Orders',
    route: '/(tabs)/orders',
    matchKey: '/orders',
    icon: 'cart-outline',
    desc: 'Manage & pack orders',
    color: '#10b981',
    badge: 'Live',
  },
  {
    name: 'Push Broadcast',
    route: '/(tabs)/more/broadcast',
    matchKey: '/broadcast',
    icon: 'notifications-outline',
    desc: 'Rich push notifications & images',
    color: '#0d9488',
    badge: 'Broadcast',
  },
  {
    name: 'Delivery Fleet',
    route: '/(tabs)/more/delivery',
    matchKey: '/delivery',
    icon: 'bicycle-outline',
    desc: 'Manage delivery riders & live orders',
    color: '#059669',
    badge: 'Fleet',
  },
  {
    name: 'Invoices',
    route: '/(tabs)/more/invoices',
    matchKey: '/invoices',
    icon: 'document-text-outline',
    desc: 'Tax invoices, billing & print',
    color: '#3b82f6',
    badge: 'Billing',
  },
  {
    name: 'Products',
    route: '/(tabs)/products',
    matchKey: '/products',
    icon: 'cube-outline',
    desc: 'Inventory & catalog',
    color: '#f59e0b',
    badge: 'Stock',
  },
  {
    name: 'Sales',
    route: '/(tabs)/more/reports',
    matchKey: '/reports',
    icon: 'trending-up-outline',
    desc: 'Revenue & analytics',
    color: '#8b5cf6',
    badge: 'Analytics',
  },
  {
    name: 'Showcase',
    route: '/(tabs)/more/showcase',
    matchKey: '/showcase',
    icon: 'images-outline',
    desc: 'Banners & home aisles',
    color: '#ec4899',
    badge: 'Visual',
  },
  {
    name: 'Categories',
    route: '/(tabs)/more/categories',
    matchKey: '/categories',
    icon: 'pricetags-outline',
    desc: 'Aisles & departments',
    color: '#06b6d4',
    badge: 'Aisles',
  },
  {
    name: 'Offers',
    route: '/(tabs)/more/offers',
    matchKey: '/offers',
    icon: 'pricetag-outline',
    desc: 'Coupons & discounts',
    color: '#ef4444',
    badge: 'Promo',
  },
  {
    name: 'Referrals',
    route: '/(tabs)/more/referrals',
    matchKey: '/referrals',
    icon: 'gift-outline',
    desc: 'Customer referral network',
    color: '#eab308',
    badge: 'Rewards',
  },
  {
    name: 'QR Scanner',
    route: '/(tabs)/more/scanner',
    matchKey: '/scanner',
    icon: 'qr-code-outline',
    desc: 'Scan referral QR & barcodes',
    color: '#10b981',
    badge: 'POS',
  },
  {
    name: 'Customers',
    route: '/(tabs)/more/customers',
    matchKey: '/customers',
    icon: 'people-outline',
    desc: 'Customer directory & CRM',
    color: '#16a34a',
    badge: 'CRM',
  },
  {
    name: 'Feedback',
    route: '/(tabs)/more/feedback',
    matchKey: '/feedback',
    icon: 'chatbox-ellipses-outline',
    desc: 'Reviews & customer ratings',
    color: '#4f46e5',
    badge: 'Reviews',
  },
  {
    name: 'Live Map',
    route: '/(tabs)/more/map',
    matchKey: '/map',
    icon: 'map-outline',
    desc: 'Live delivery GPS map',
    color: '#ec4899',
    badge: 'GPS',
  },
  {
    name: 'Settings',
    route: '/(tabs)/more/settings',
    matchKey: '/settings',
    icon: 'settings-outline',
    desc: 'Store hours, delivery & fees',
    color: '#475569',
    badge: 'Config',
  },
  {
    name: 'Advanced Settings',
    route: '/(tabs)/more/advanced-settings',
    matchKey: '/advanced-settings',
    icon: 'options-outline',
    desc: 'UPI, slots, timings & loyalty',
    color: '#ea580c',
    badge: 'Advanced',
  },
];

export default function TabLayout() {
  const { token, isLoading, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = width >= 1024;

    const [storeOpen, setStoreOpen] = useState(true);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [newOrdersBadge, setNewOrdersBadge] = useState(0);
  const [activeOrdersBadge, setActiveOrdersBadge] = useState(0);

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

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    api
      .get('/orders/')
      .then((res) => {
        if (!isMounted) return;
        const list = Array.isArray(res?.data?.results)
          ? res.data.results
          : Array.isArray(res?.data)
            ? res.data
            : [];
        const newCount = list.filter((o: any) => o.status === 'NEW').length;
        const activeCount = list.filter((o: any) =>
          ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.status)
        ).length;
        setNewOrdersBadge(newCount);
        setActiveOrdersBadge(activeCount);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [token, pathname]);

  if (isLoading || (Platform.OS === 'web' && typeof window === 'undefined')) {
    return null;
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  const isSectionActive = (item: NavSection) => {
    const cleanPath = (pathname || '/').replace(/\/$/, '') || '/';
    if (item.matchKey === 'index') {
      return cleanPath === '/' || cleanPath === '/(tabs)' || cleanPath === '/index';
    }
    if (item.matchKey === '/settings') {
      return cleanPath.endsWith('/settings') && !cleanPath.endsWith('/advanced-settings');
    }
    return cleanPath.includes(item.matchKey);
  };

  const currentSection =
    OWNER_NAVIGATION.find((item) => isSectionActive(item)) || OWNER_NAVIGATION[0];

  const isHomeTab = currentSection.matchKey === 'index';
  const isOrdersTab = currentSection.matchKey === '/orders';
  const isScanTab = currentSection.matchKey === '/scanner';
  const isProductsTab = currentSection.matchKey === '/products';
  const isMoreSection = !['index', '/orders', '/products', '/scanner'].includes(
    currentSection.matchKey
  );
  const isProfileTab = isMoreSection;
  const isSubScreen =
    !isDesktop && isMoreSection && pathname !== '/(tabs)/more' && pathname !== '/more';

  const handleToggleStore = async () => {
    const nextState = !storeOpen;
    setStoreOpen(nextState);
    try {
      await api.patch('/store/settings/', { is_open: nextState });
    } catch {
      setStoreOpen(!nextState);
    }
  };

  const navigateTo = (route: string) => {
    router.push(route as any);
  };

  return (
    <View style={[styles.shell, { backgroundColor: colors.bg }]}>
      {/* Permanent Left Sidebar on Desktop Only */}
      {isDesktop && (
        <View style={styles.desktopSidebar}>
          <View style={styles.sidebarInner}>
            <View style={styles.sidebarBrandHeader}>
              <TouchableOpacity
                style={styles.sidebarBrandTouch}
                onPress={() => navigateTo('/(tabs)')}
              >
                <View style={styles.sidebarLogoBox}>
                  <Image
                    source={require('../../../assets/images/narendra-logo.png')}
                    style={styles.sidebarLogoImg}
                    contentFit="contain"
                  />
                </View>
                <View>
                  <Text style={styles.sidebarBrandTitle}>
                    <Text style={{ color: '#ffffff' }}>Narendra </Text>
                    <Text style={{ color: '#34d399' }}>Kirana</Text>
                  </Text>
                  <Text style={styles.sidebarBrandSub}>STORE MANAGER</Text>
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavScroll} contentContainerStyle={{ padding: 12 }}>
              {OWNER_NAVIGATION.map((item) => {
                const active = isSectionActive(item);
                return (
                  <TouchableOpacity
                    key={item.name}
                    style={[styles.sidebarNavItem, active && styles.sidebarNavItemActive]}
                    onPress={() => navigateTo(item.route)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={active ? '#34d399' : '#94a3b8'}
                      style={{ marginRight: 12 }}
                    />
                    <Text
                      style={[
                        styles.sidebarNavText,
                        active && { color: '#34d399', fontWeight: '700' },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {active && <View style={styles.sidebarActiveDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.sidebarFooterBtn} onPress={logout}>
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color="#f43f5e"
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.sidebarFooterText, { color: '#fda4af' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Main Content Column */}
      <View style={styles.mainCol}>
        {/* Single Streamlined Top Header Bar (Desktop breadcrumb OR Mobile main tabs only) */}
        {!isSubScreen && (
          <View
            style={[
              styles.topHeader,
              {
                backgroundColor: colors.headerBg,
                borderBottomColor: colors.border,
                paddingTop: insets.top,
              },
            ]}
          >
            <View style={styles.headerLeft}>
              {isDesktop ? (
                <View style={styles.breadcrumbRow}>
                  <Text style={[styles.breadcrumbPortal, { color: colors.textMuted }]}>
                    OWNER PORTAL
                  </Text>
                  <Text style={{ color: colors.border, marginHorizontal: 6 }}>/</Text>
                  <Ionicons name={currentSection.icon} size={16} color="#10b981" />
                  <Text style={[styles.breadcrumbSection, { color: colors.text }]}>
                    {currentSection.name}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.mobileBrandWrap}
                  onPress={() => navigateTo('/(tabs)')}
                >
                  <View style={styles.mobileLogoDot}>
                    <Image
                      source={require('../../../assets/images/narendra-logo.png')}
                      style={styles.mobileLogoImg}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={styles.mobileBrandTitle}>
                    <Text style={{ color: colors.text }}>Narendra </Text>
                    <Text style={{ color: '#10b981' }}>Kirana</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Main Screen Outlet via Expo Router Tabs */}
        <View style={styles.contentArea}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' },
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="orders" options={{ title: 'Orders' }} />
            <Tabs.Screen name="products" options={{ title: 'Products' }} />
            <Tabs.Screen name="more" options={{ title: 'Profile' }} />
          </Tabs>
        </View>

        {/* Single Thumb-Friendly Mobile Bottom Navigation Bar */}
        {!isDesktop && (
          <View
            style={[
              styles.mobileBottomBarWrap,
              {
                backgroundColor: colors.headerBg,
                borderTopColor: colors.border,
                paddingBottom: Math.max(insets.bottom, 6),
              },
            ]}
          >
            <View style={styles.mobileBottomBarInner}>
              {/* 1. HOME TAB */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.bottomTabBtn}
                onPress={() => navigateTo('/(tabs)')}
              >
                <View
                  style={[
                    styles.tabActiveTopBar,
                    { backgroundColor: isHomeTab ? '#10b981' : 'transparent' },
                  ]}
                />
                <View
                  style={[
                    styles.tabIconPill,
                    isHomeTab && {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : '#ecfdf5',
                    },
                  ]}
                >
                  <Ionicons
                    name={isHomeTab ? 'home' : 'home-outline'}
                    size={20}
                    color={isHomeTab ? '#10b981' : colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.bottomTabText,
                    {
                      color: isHomeTab ? '#10b981' : colors.textMuted,
                      fontWeight: isHomeTab ? '800' : '600',
                    },
                  ]}
                >
                  Home
                </Text>
              </TouchableOpacity>

              {/* 2. ORDERS TAB (WITH LIVE BADGE) */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.bottomTabBtn}
                onPress={() => navigateTo('/(tabs)/orders')}
              >
                <View
                  style={[
                    styles.tabActiveTopBar,
                    { backgroundColor: isOrdersTab ? '#10b981' : 'transparent' },
                  ]}
                />
                <View
                  style={[
                    styles.tabIconPill,
                    isOrdersTab && {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : '#ecfdf5',
                    },
                  ]}
                >
                  <Ionicons
                    name={isOrdersTab ? 'receipt' : 'receipt-outline'}
                    size={20}
                    color={isOrdersTab ? '#10b981' : colors.textMuted}
                  />
                  {activeOrdersBadge > 0 && (
                    <View
                      style={[
                        styles.tabBadgePill,
                        {
                          backgroundColor:
                            newOrdersBadge > 0 ? '#e11d48' : '#10b981',
                          borderColor: colors.headerBg,
                        },
                      ]}
                    >
                      <Text style={styles.tabBadgeText}>
                        {newOrdersBadge > 0
                          ? newOrdersBadge > 99
                            ? '99+'
                            : newOrdersBadge
                          : activeOrdersBadge > 99
                            ? '99+'
                            : activeOrdersBadge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.bottomTabText,
                    {
                      color: isOrdersTab ? '#10b981' : colors.textMuted,
                      fontWeight: isOrdersTab ? '800' : '600',
                    },
                  ]}
                >
                  Orders
                </Text>
              </TouchableOpacity>

              {/* 3. CENTER DOCKED QR & BARCODE SCANNER */}
              <View style={styles.centerScanSlot}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.centerScanDock,
                    {
                      borderColor: colors.headerBg,
                      backgroundColor: isScanTab ? '#059669' : '#10b981',
                    },
                  ]}
                  onPress={() => navigateTo('/(tabs)/more/scanner')}
                >
                  <Ionicons
                    name={isScanTab ? 'qr-code' : 'qr-code-outline'}
                    size={22}
                    color="#ffffff"
                  />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.bottomTabText,
                    {
                      color: isScanTab ? '#10b981' : colors.textMuted,
                      fontWeight: isScanTab ? '800' : '700',
                      marginTop: 2,
                    },
                  ]}
                >
                  Scan
                </Text>
              </View>

              {/* 4. PRODUCTS TAB */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.bottomTabBtn}
                onPress={() => navigateTo('/(tabs)/products')}
              >
                <View
                  style={[
                    styles.tabActiveTopBar,
                    {
                      backgroundColor: isProductsTab ? '#10b981' : 'transparent',
                    },
                  ]}
                />
                <View
                  style={[
                    styles.tabIconPill,
                    isProductsTab && {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : '#ecfdf5',
                    },
                  ]}
                >
                  <Ionicons
                    name={isProductsTab ? 'cube' : 'cube-outline'}
                    size={20}
                    color={isProductsTab ? '#10b981' : colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    styles.bottomTabText,
                    {
                      color: isProductsTab ? '#10b981' : colors.textMuted,
                      fontWeight: isProductsTab ? '800' : '600',
                    },
                  ]}
                >
                  Products
                </Text>
              </TouchableOpacity>

              {/* 5. PROFILE TAB */}
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.bottomTabBtn}
                onPress={() => navigateTo('/(tabs)/more')}
              >
                <View
                  style={[
                    styles.tabActiveTopBar,
                    { backgroundColor: isProfileTab ? '#10b981' : 'transparent' },
                  ]}
                />
                <View
                  style={[
                    styles.tabIconPill,
                    isProfileTab && {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.16)'
                        : '#ecfdf5',
                    },
                  ]}
                >
                  <Ionicons
                    name={isProfileTab ? 'person' : 'person-outline'}
                    size={22}
                    color={isProfileTab ? '#10b981' : colors.textMuted}
                  />
                </View>
                <Text
                  style={[
                    { fontSize: 10, marginTop: 4 },
                    {
                      color: isProfileTab ? '#10b981' : colors.textMuted,
                      fontWeight: isProfileTab ? '800' : '600',
                    },
                  ]}
                  numberOfLines={1}
                >
                  Profile
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopSidebar: {
    width: 250,
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
  },
  sidebarInner: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  sidebarBrandHeader: {
    height: 60,
    paddingHorizontal: 16,
    backgroundColor: '#020617',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarBrandTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarLogoBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sidebarLogoImg: {
    width: 28,
    height: 28,
  },
  sidebarBrandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sidebarBrandSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.4,
    marginTop: 1,
  },
  sidebarNavScroll: {
    flex: 1,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 3,
  },
  sidebarNavItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  sidebarNavText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  sidebarActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  sidebarFooter: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  sidebarFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  sidebarFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  mainCol: {
    flex: 1,
  },
  topHeader: {
    minHeight: 54,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mobileLogoDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mobileLogoImg: {
    width: 30,
    height: 30,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  breadcrumbPortal: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  breadcrumbSection: {
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  mobileBrandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
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
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  hubControlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  hubStorePill: {
    flex: 1.15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  hubStoreInfo: {
    flex: 1,
  },
  hubStoreTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  hubStoreSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  hubThemeBtn: {
    flex: 0.85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  hubThemeInfo: {
    flex: 1,
  },
  hubThemeTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  hubThemeSub: {
    fontSize: 10,
    fontWeight: '600',
  },
  contentArea: {
    flex: 1,
  },
  mobileBottomBarWrap: {
    borderTopWidth: 1,
    paddingHorizontal: 6,
    boxShadow: '0px -4px 16px rgba(15, 23, 42, 0.08)',
    elevation: 10,
  },
  mobileBottomBarInner: {
    height: 64,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  bottomTabBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 2,
  },
  tabActiveTopBar: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  tabIconPill: {
    width: 46,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 2,
  },
  tabBadgePill: {
    position: 'absolute',
    top: -3,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
  hubActiveDot: {
    position: 'absolute',
    top: 1,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 1.5,
  },
  bottomTabText: {
    fontSize: 10,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  centerScanSlot: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 5,
  },
  centerScanDock: {
    width: 50,
    height: 50,
    borderRadius: 18,
    marginTop: -18,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 14px rgba(16, 185, 129, 0.38)',
    elevation: 6,
  },
  hubBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  hubSheet: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  hubDragHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  hubDragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  hubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  hubHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hubHeaderIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  hubSubtitle: {
    fontSize: 11,
  },
  hubCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubGrid: {
    padding: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  hubCard: {
    width: '48%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  hubCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hubCardIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hubCardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hubCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  hubCardName: {
    fontSize: 13,
    fontWeight: '800',
  },
  hubCardDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  hubFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  hubLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hubLogoutText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '700',
  },
});
