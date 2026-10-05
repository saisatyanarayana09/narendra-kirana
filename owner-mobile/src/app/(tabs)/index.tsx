import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { ApiInstance, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { showAlert } from '../../utils/alerts';
import { safeStorage } from '../../utils/storage';

interface BentoAction {
  label: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgLight: string;
  bgDark: string;
  route: string;
}

const BENTO_ACTIONS: BentoAction[] = [
  {
    label: 'Add Product',
    sub: 'New item or SKU',
    icon: 'add-circle',
    color: '#4f46e5',
    bgLight: '#eef2ff',
    bgDark: 'rgba(79, 70, 229, 0.18)',
    route: '/(tabs)/products/new',
  },
  {
    label: 'Delivery Fleet',
    sub: 'Riders & dispatches',
    icon: 'bicycle',
    color: '#059669',
    bgLight: '#ecfdf5',
    bgDark: 'rgba(5, 150, 105, 0.18)',
    route: '/(tabs)/more/delivery',
  },
  {
    label: 'Tax Invoices',
    sub: 'Billing & CSV export',
    icon: 'document-text',
    color: '#2563eb',
    bgLight: '#eff6ff',
    bgDark: 'rgba(37, 99, 235, 0.18)',
    route: '/(tabs)/more/invoices',
  },
  {
    label: 'Broadcast',
    sub: 'Customer push alert',
    icon: 'megaphone',
    color: '#db2777',
    bgLight: '#fdf2f8',
    bgDark: 'rgba(219, 39, 119, 0.18)',
    route: '/(tabs)/more/broadcast',
  },
  {
    label: 'Promo Offers',
    sub: 'Discount coupons',
    icon: 'pricetag',
    color: '#d97706',
    bgLight: '#fffbeb',
    bgDark: 'rgba(217, 119, 6, 0.18)',
    route: '/(tabs)/more/offers',
  },
  {
    label: 'Referrals',
    sub: 'Rewards & milestones',
    icon: 'gift',
    color: '#7c3aed',
    bgLight: '#f5f3ff',
    bgDark: 'rgba(124, 58, 237, 0.18)',
    route: '/(tabs)/more/referrals',
  },
];

interface BentoActionCardProps {
  item: BentoAction;
  isWide: boolean;
  colors: any;
  isDark: boolean;
  onPress: (route: string) => void;
}

const BentoActionCard = React.memo(
  ({ item, isWide, colors, isDark, onPress }: BentoActionCardProps) => {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={[
          styles.bentoCard,
          {
            width: isWide ? '32%' : '48.4%',
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() => onPress(item.route)}
      >
        <View
          style={[
            styles.bentoIconWrap,
            { backgroundColor: isDark ? item.bgDark : item.bgLight },
          ]}
        >
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
        <View style={styles.bentoTextCol}>
          <Text
            style={[styles.bentoTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          <Text
            style={[styles.bentoSub, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {item.sub}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.item.label === next.item.label &&
      prev.isWide === next.isWide &&
      prev.isDark === next.isDark &&
      prev.colors === next.colors &&
      prev.onPress === next.onPress
    );
  }
);

interface LowStockRowItemProps {
  item: any;
  showTopBorder: boolean;
  isDark: boolean;
  colors: any;
  isBusy: boolean;
  onPress: (id: string | number) => void;
  onRestock: (product: any, amount: number) => void;
}

const LowStockRowItem = React.memo(
  ({
    item,
    showTopBorder,
    isDark,
    colors,
    isBusy,
    onPress,
    onRestock,
  }: LowStockRowItemProps) => {
    const isOutOfStock = Number(item.stock_quantity ?? 0) === 0;

    return (
      <View
        style={[
          styles.lowStockCompactItemRow,
          showTopBorder && {
            borderTopWidth: 1,
            borderTopColor: isDark
              ? 'rgba(255, 255, 255, 0.06)'
              : 'rgba(0, 0, 0, 0.05)',
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.lowStockCompactItemInfo}
          onPress={() => onPress(item.id)}
        >
          <Text
            style={[styles.lowStockItemName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.lowStockBadgesRow}>
            <View
              style={[
                styles.stockLevelChip,
                isOutOfStock
                  ? styles.stockLevelChipOut
                  : styles.stockLevelChipLow,
              ]}
            >
              <Text
                style={[
                  styles.stockLevelChipText,
                  isOutOfStock ? { color: '#ef4444' } : { color: '#d97706' },
                ]}
              >
                {isOutOfStock ? 'OUT' : 'LOW'}
              </Text>
            </View>
            <Text
              style={[
                styles.stockLeftText,
                { color: colors.textMuted },
              ]}
            >
              {item.stock_quantity ?? 0} {item.unit || 'units'} left
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.restockButtonsWrap}>
          {isBusy ? (
            <ActivityIndicator
              size="small"
              color="#10b981"
              style={{ paddingHorizontal: 16 }}
            />
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.restockBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onRestock(item, 5)}
              >
                <Ionicons name="add" size={13} color="#10b981" />
                <Text
                  style={[
                    styles.restockBtnText,
                    { color: colors.text },
                  ]}
                >
                  +5
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.restockBtn,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onRestock(item, 10)}
              >
                <Ionicons name="add" size={13} color="#10b981" />
                <Text
                  style={[
                    styles.restockBtnText,
                    { color: colors.text },
                  ]}
                >
                  +10
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  },
  (prev, next) => {
    return (
      prev.item?.id === next.item?.id &&
      prev.item?.stock_quantity === next.item?.stock_quantity &&
      prev.item?.name === next.item?.name &&
      prev.item?.unit === next.item?.unit &&
      prev.showTopBorder === next.showTopBorder &&
      prev.isBusy === next.isBusy &&
      prev.isDark === next.isDark &&
      prev.colors === next.colors &&
      prev.onPress === next.onPress &&
      prev.onRestock === next.onRestock
    );
  }
);

export default function DashboardScreen() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { isDark, colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [ownerName, setOwnerName] = useState('Owner');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [restockingId, setRestockingId] = useState<number | null>(null);

  const fetchDashboardData = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Background revalidation → re-run (served from the just-refreshed cache, no extra network)
        const onUpdate = () => {
          void fetchDashboardData(false);
        };
        const [ordersRes, analyticsRes, productsRes] = await Promise.all([
          (api as ApiInstance).cachedGet('/orders/', { forceRefresh, onUpdate }),
          (api as ApiInstance).cachedGet('/orders/analytics/', { forceRefresh, onUpdate }),
          (api as ApiInstance).cachedGet('/products/?limit=100', { forceRefresh, onUpdate }),
        ]);

        const rawOrders = ordersRes?.data?.results ?? ordersRes?.data;
        setOrders(Array.isArray(rawOrders) ? rawOrders : []);
        setAnalytics(analyticsRes?.data ?? null);
        const rawProds = productsRes?.data?.results ?? productsRes?.data;
        setProducts(Array.isArray(rawProds) ? rawProds : []);
      } catch {
        // Handled gracefully
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (authLoading || !token) return;

    safeStorage.getItem('smart-kirana-owner-user').then((raw) => {
      if (raw) {
        try {
          const u = JSON.parse(raw);
          const full = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username;
          if (full) setOwnerName(full);
        } catch {}
      }
    });

    api
      .get('/auth/profile/')
      .then((res) => {
        if (res?.data) {
          safeStorage.setItem('smart-kirana-owner-user', JSON.stringify(res.data));
          const full =
            [res.data.first_name, res.data.last_name].filter(Boolean).join(' ') ||
            res.data.username ||
            'Owner';
          setOwnerName(full);
        }
      })
      .catch(() => {});

    fetchDashboardData(false);
  }, [authLoading, token, fetchDashboardData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const { greeting, dateString } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const g =
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const ds = now.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return { greeting: g, dateString: ds };
  }, []);

  const { newOrdersCount, activeOrdersCount } = useMemo(() => {
    let newCnt = 0;
    let activeCnt = 0;
    const safeOrders = Array.isArray(orders) ? orders : [];
    const ACTIVE_STATUSES = new Set(['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']);

    for (let i = 0; i < safeOrders.length; i++) {
      const o = safeOrders[i];
      if (!o) continue;
      if (o.status === 'NEW') newCnt++;
      if (ACTIVE_STATUSES.has(o.status)) {
        activeCnt++;
      }
    }

    return {
      newOrdersCount: newCnt,
      activeOrdersCount: activeCnt,
    };
  }, [orders]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((p) => Number(p?.stock_quantity ?? 0) <= 5)
      .sort((a, b) => Number(a?.stock_quantity ?? 0) - Number(b?.stock_quantity ?? 0));
  }, [products]);

  const handleQuickRestock = useCallback(async (product: any, amount: number) => {
    const prevStock = Number(product?.stock_quantity ?? 0);
    const newStock = prevStock + amount;
    setRestockingId(product.id);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock_quantity: newStock } : p))
    );

    try {
      await api.patch(`/products/${product.id}/`, { stock_quantity: newStock });
      (api as ApiInstance).clearCache();
      showAlert('Restocked!', `Added +${amount} to "${product.name}". Total in stock: ${newStock}`);
    } catch (e: any) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock_quantity: prevStock } : p))
      );
      showAlert('Restock Failed', getErrorMessage(e, 'Failed to update stock quantity.'));
    } finally {
      setRestockingId(null);
    }
  }, []);

  const handleBentoPress = useCallback((route: string) => {
    router.push(route as any);
  }, [router]);

  const handleProductPress = useCallback((productId: string | number) => {
    router.push(`/(tabs)/products/new?id=${productId}` as any);
  }, [router]);

  const handleOrdersPress = useCallback(() => {
    router.push('/(tabs)/orders');
  }, [router]);

  const handleReportsPress = useCallback(() => {
    router.push('/(tabs)/more/reports');
  }, [router]);

  const handleProductsCatalogPress = useCallback(() => {
    router.push('/(tabs)/products');
  }, [router]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
      }
    >
      <View style={styles.maxContainer}>
        {/* 1. Executive Hero Summary Card */}
        <View style={styles.heroBanner}>
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={11} color="#34d399" />
                <Text style={styles.datePillText}>{dateString.toUpperCase()}</Text>
              </View>
              <Text style={styles.heroGreeting}>
                {greeting}, {ownerName}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.heroRefreshBtn}
              onPress={() => onRefresh()}
              accessibilityLabel="Refresh Dashboard"
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#34d399" />
              ) : (
                <Ionicons name="refresh" size={18} color="#f8fafc" />
              )}
            </TouchableOpacity>
          </View>

          {/* Dual Interactive Highlight Cards Inside Hero */}
          <View style={styles.heroMetricsRow}>
            {/* Card A: Needs Approval */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroMetricBox}
              onPress={handleOrdersPress}
            >
              <View style={styles.heroMetricTop}>
                <View style={[styles.heroIconCircle, { backgroundColor: 'rgba(244, 63, 94, 0.2)' }]}>
                  <Ionicons name="notifications" size={16} color="#fb7185" />
                </View>
                <View
                  style={[
                    styles.heroMiniTag,
                    {
                      backgroundColor:
                        newOrdersCount > 0
                          ? 'rgba(244, 63, 94, 0.25)'
                          : 'rgba(148, 163, 184, 0.15)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.heroMiniTagText,
                      { color: newOrdersCount > 0 ? '#fda4af' : '#94a3b8' },
                    ]}
                  >
                    {newOrdersCount > 0 ? 'VIEW ORDERS ↗' : 'ALL CAUGHT UP'}
                  </Text>
                </View>
              </View>

              <Text style={styles.heroMetricValue}>
                {loading ? '—' : newOrdersCount}
              </Text>
              <Text style={styles.heroMetricLabel}>Needs Approval</Text>
              <Text style={styles.heroMetricSub}>
                {activeOrdersCount} active in store
              </Text>
            </TouchableOpacity>

            {/* Card B: Today's Revenue */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.heroMetricBox}
              onPress={handleReportsPress}
            >
              <View style={styles.heroMetricTop}>
                <View
                  style={[
                    styles.heroIconCircle,
                    { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Ionicons name="trending-up" size={16} color="#34d399" />
                </View>
                <View
                  style={[
                    styles.heroMiniTag,
                    { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  ]}
                >
                  <Text style={[styles.heroMiniTagText, { color: '#6ee7b7' }]}>
                    ANALYTICS ↗
                  </Text>
                </View>
              </View>

              <Text style={styles.heroMetricValue} numberOfLines={1}>
                ₹{loading ? '—' : analytics?.today_sales ?? 0}
              </Text>
              <Text style={styles.heroMetricLabel}>{"Today's Revenue"}</Text>
              <Text style={styles.heroMetricSub} numberOfLines={1}>
                Week: ₹{loading ? '0' : analytics?.weekly_sales ?? 0}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Tactile Bento Grid Shortcuts (2x3 on Mobile, 3x2 on Tablet/Desktop) */}
        <View style={styles.bentoSection}>
          <Text style={[styles.sectionEyebrow, { color: colors.textMuted }]}>
            QUICK STORE SHORTCUTS
          </Text>
          <View style={styles.bentoGrid}>
            {BENTO_ACTIONS.map((item) => (
              <BentoActionCard
                key={item.label}
                item={item}
                isWide={isWide}
                colors={colors}
                isDark={isDark}
                onPress={handleBentoPress}
              />
            ))}
          </View>
        </View>

        {/* 3. Compact Low Stock Alert (Only shown when items actually need restock) */}
        {lowStockProducts.length > 0 && (
          <View
            style={[
              styles.lowStockCompactCard,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.06)' : '#fff8f6',
                borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : '#fed7aa',
              },
            ]}
          >
            {/* Alert Header */}
            <View style={styles.lowStockCompactHeader}>
              <View style={styles.lowStockTitleLeft}>
                <Ionicons name="warning-outline" size={16} color="#ef4444" />
                <Text style={[styles.lowStockCompactTitle, { color: colors.text }]}>
                  Low Stock Alerts
                </Text>
                <View style={styles.lowStockBadgeRed}>
                  <Text style={styles.lowStockBadgeRedText}>
                    {lowStockProducts.length} Needs Restock
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewCatalogLink}
                onPress={handleProductsCatalogPress}
              >
                <Text style={styles.viewCatalogText}>View All</Text>
                <Ionicons name="arrow-forward" size={12} color="#4f46e5" />
              </TouchableOpacity>
            </View>

            {/* Compact Items (Top 2 most critical) */}
            <View style={styles.lowStockCompactList}>
              {lowStockProducts.slice(0, 2).map((item, idx) => (
                <LowStockRowItem
                  key={item.id}
                  item={item}
                  showTopBorder={idx > 0}
                  isDark={isDark}
                  colors={colors}
                  isBusy={restockingId === item.id}
                  onPress={handleProductPress}
                  onRestock={handleQuickRestock}
                />
              ))}
            </View>

            {lowStockProducts.length > 2 && (
              <TouchableOpacity
                style={[
                  styles.lowStockFooterLink,
                  {
                    borderTopColor: isDark
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(0, 0, 0, 0.05)',
                  },
                ]}
                onPress={handleProductsCatalogPress}
              >
                <Text style={styles.lowStockFooterLinkText}>
                  +{lowStockProducts.length - 2} more items need restock • Manage in Products →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </View>
    </ScrollView>
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
    maxWidth: 1080,
    alignSelf: 'center',
    gap: 18,
  },
  heroBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    boxShadow: '0px 6px 14px rgba(15, 23, 42, 0.18)',
    elevation: 5,
    gap: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  datePillText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroGreeting: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  heroRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  heroMetricBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  heroMetricBoxSelectedRose: {
    borderColor: '#fb7185',
    backgroundColor: 'rgba(225, 29, 72, 0.14)',
  },
  heroMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroMiniTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  heroMiniTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  heroMetricValue: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heroMetricLabel: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  heroMetricSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  bentoSection: {
    gap: 8,
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    paddingHorizontal: 2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bentoCard: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  bentoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bentoTextCol: {
    flex: 1,
  },
  bentoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bentoSub: {
    fontSize: 11,
    marginTop: 1,
  },
  // Compact Low Stock Alerts Section Styles
  lowStockCompactCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 12,
    gap: 10,
  },
  lowStockCompactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lowStockTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lowStockCompactTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  lowStockBadgeRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  lowStockBadgeRedText: {
    color: '#ef4444',
    fontSize: 10.5,
    fontWeight: '700',
  },
  viewCatalogLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewCatalogText: {
    color: '#4f46e5',
    fontSize: 12,
    fontWeight: '700',
  },
  lowStockCompactList: {
    gap: 8,
  },
  lowStockCompactItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  lowStockCompactItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  lowStockItemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  lowStockBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  stockLevelChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stockLevelChipOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
  },
  stockLevelChipLow: {
    backgroundColor: 'rgba(217, 119, 6, 0.14)',
  },
  stockLevelChipText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  stockLeftText: {
    fontSize: 11,
    fontWeight: '600',
  },
  restockButtonsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  restockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  restockBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  lowStockFooterLink: {
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  lowStockFooterLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#d97706',
  },
});
