import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Animated,
  TextInput,
  ScrollView,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { AppNavigationProp } from "../../navigation/types";
import {
  getCachedOrdersSync,
  loadCachedOrders,
  saveCachedOrders,
} from "../../services/ordersCache";

/* ─── Skeleton Loader ─── */
const SkeletonCard = ({ colors, isDark }: { colors: any; isDark: boolean }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  const b = isDark ? "#1E293B" : "#F1F5F9";
  return (
    <Animated.View style={[s.premiumCard, { backgroundColor: colors.surface, opacity: pulse, padding: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: b }} />
        <View style={{ flex: 1, marginLeft: 16, gap: 8 }}>
          <View style={{ width: 120, height: 16, backgroundColor: b, borderRadius: 4 }} />
          <View style={{ width: 180, height: 12, backgroundColor: b, borderRadius: 4 }} />
        </View>
        <View style={{ width: 60, height: 18, backgroundColor: b, borderRadius: 4 }} />
      </View>
    </Animated.View>
  );
};

/* ─── Status Helper ─── */
type StatusMeta = { bg: string; text: string; border: string; icon: string; label: string };

const STATUS_MAP_LIGHT: Record<string, StatusMeta> = {
  COMPLETED: { bg: "#ECFDF5", text: "#047857", border: "#A7F3D0", icon: "check-circle", label: "Delivered" },
  REJECTED: { bg: "#FFF1F2", text: "#BE123C", border: "#FECDD3", icon: "x-circle", label: "Cancelled" },
  READY: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE", icon: "truck", label: "Ready" },
  PREPARING: { bg: "#FFFBEB", text: "#B45309", border: "#FDE68A", icon: "loader", label: "Preparing" },
  NEW: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE", icon: "clock", label: "Placed" },
  DEFAULT: { bg: "#F8FAFC", text: "#475569", border: "#E2E8F0", icon: "info", label: "Order" },
};
const STATUS_MAP_DARK: Record<string, StatusMeta> = {
  COMPLETED: { bg: "rgba(16,185,129,0.15)", text: "#34D399", border: "rgba(16,185,129,0.3)", icon: "check-circle", label: "Delivered" },
  REJECTED: { bg: "rgba(244,63,94,0.15)", text: "#FB7185", border: "rgba(244,63,94,0.3)", icon: "x-circle", label: "Cancelled" },
  READY: { bg: "rgba(59,130,246,0.15)", text: "#60A5FA", border: "rgba(59,130,246,0.3)", icon: "truck", label: "Ready" },
  PREPARING: { bg: "rgba(245,158,11,0.15)", text: "#FBBF24", border: "rgba(245,158,11,0.3)", icon: "loader", label: "Preparing" },
  NEW: { bg: "rgba(99,102,241,0.15)", text: "#818CF8", border: "rgba(99,102,241,0.3)", icon: "clock", label: "Placed" },
  DEFAULT: { bg: "rgba(148,163,184,0.15)", text: "#94A3B8", border: "rgba(148,163,184,0.3)", icon: "info", label: "Order" },
};

/* ─── Date Formatter ─── */
const fmtDate = (d: string) => {
  try {
    const dt = new Date(d);
    const day = dt.getDate();
    const mon = dt.toLocaleDateString("en-US", { month: "short" });
    const hr = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${day} ${mon}, ${hr}`;
  } catch {
    return d;
  }
};

/* ─── Main Screen ─── */
export function OrderHistoryScreen({ navigation }: { navigation: AppNavigationProp }) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const cachedOrders = getCachedOrdersSync();
  const [orders, setOrders] = useState<any[]>(cachedOrders || []);
  const [loading, setLoading] = useState(!cachedOrders || cachedOrders.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const requestIdRef = useRef(0);
  const hasRenderedRef = useRef(Boolean(cachedOrders && cachedOrders.length > 0));

  useEffect(() => {
    if (user) {
      if (orders.length === 0 && !searchQuery && statusFilter === "ALL") {
        loadCachedOrders().then((cached) => {
          if (cached && cached.length > 0) {
            setOrders((prev) => (prev.length === 0 ? cached : prev));
            hasRenderedRef.current = true;
            setLoading(false);
          }
        });
      }
      fetchOrders(1);
    } else {
      setOrders([]);
      hasRenderedRef.current = false;
      setLoading(false);
    }
  }, [user, searchQuery, statusFilter]);

  const fetchOrders = async (pageNum: number, isRefresh = false, isLoadMore = false) => {
    if (!user) { setLoading(false); return; }
    if (isLoadMore) {
      if (loadingMore || !hasMore || loading || refreshing) return;
      setLoadingMore(true);
    } else if (isRefresh) {
      setRefreshing(true);
    } else if (!hasRenderedRef.current && orders.length === 0) {
      setLoading(true);
    }

    const reqId = ++requestIdRef.current;
    try {
      let url = `/orders/?page=${pageNum}&page_size=5`;
      if (searchQuery) url += `&search=${searchQuery}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      
      const res = await apiClient.get(url);
      if (reqId !== requestIdRef.current) return;
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : raw?.results || [];
      if (pageNum === 1) {
        setOrders(list);
        hasRenderedRef.current = list.length > 0;
        saveCachedOrders(list).catch(() => {});
      } else {
        setOrders((prev) => {
          const ids = new Set(prev.map((o) => String(o.id)));
          return [...prev, ...list.filter((o: any) => !ids.has(String(o.id)))];
        });
      }
      setHasMore(Boolean(raw?.next));
      setPage(pageNum);
    } catch (e: any) {
      if (e?.response?.status !== 401) console.error("Error fetching orders:", e);
    } finally {
      if (reqId === requestIdRef.current) {
        if (isLoadMore) setLoadingMore(false);
        if (isRefresh) setRefreshing(false);
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("HomeTab");
  };

  const statusMeta = useCallback(
    (st: string): StatusMeta => (isDark ? STATUS_MAP_DARK : STATUS_MAP_LIGHT)[st] || (isDark ? STATUS_MAP_DARK : STATUS_MAP_LIGHT).DEFAULT,
    [isDark],
  );

  /* ─── Header Component ─── */
  const Header = () => (
    <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={s.backBtn}>
        <Feather name="arrow-left" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={[s.headerTitle, { color: colors.text }]}>My Orders</Text>
      <View style={{ width: 22 }} />
    </View>
  );

  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ─── Premium Order Card ─── */
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const meta = statusMeta(item.status);
      const total = (parseFloat(String(item?.total_amount || 0)) || 0).toFixed(2);
      const count = item.items?.length || 0;
      
      const firstItem = item.items?.[0];
      const additionalCount = count > 1 ? count - 1 : 0;

      const images = (item.items || []).map((i: any) => i.product_image).filter(Boolean);
      const displayImages = images.slice(0, 4);
      const extraImages = images.length > 4 ? images.length - 4 : 0;

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate("OrderTrackingScreen", { orderId: item.id, initialOrder: item })}
          style={[s.premiumCard, { backgroundColor: colors.surface }]}
        >
          {/* Top Row: Order ID & Status */}
          <View style={[s.pcHeader, { borderBottomColor: isDark ? "#334155" : "#F1F5F9" }]}>
            <Text style={[s.pcOrderId, { color: colors.text }]}>{item.id}</Text>
            <View style={[s.pcStatusPill, { backgroundColor: meta.bg }]}>
              <Text style={[s.pcStatusText, { color: meta.text }]}>{meta.label}</Text>
            </View>
          </View>

          {/* Middle Row: Image Thumbnails */}
          <View style={s.pcImagesRow}>
            {displayImages.length > 0 ? (
              displayImages.map((img: string, idx: number) => (
                <View 
                  key={idx} 
                  style={[
                    s.pcThumbnailShadowBox, 
                    { 
                      backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                      zIndex: idx,
                      marginLeft: idx === 0 ? 0 : -14 
                    }
                  ]}
                >
                  <Image source={{ uri: img }} style={s.pcThumbnail} />
                </View>
              ))
            ) : (
              <View style={[s.pcThumbnailShadowBox, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", justifyContent: "center", alignItems: "center" }]}>
                <Feather name="shopping-bag" size={20} color={colors.primary} />
              </View>
            )}
            {extraImages > 0 && (
              <View style={[
                s.pcThumbnailExtra, 
                { 
                  backgroundColor: isDark ? "#334155" : "#E2E8F0",
                  zIndex: 10,
                  marginLeft: -14
                }
              ]}>
                <Text style={[s.pcThumbnailExtraText, { color: colors.text }]}>+{extraImages}</Text>
              </View>
            )}
          </View>

          {/* Bottom Row: Item Summary, Date, Price */}
          <View style={s.pcFooter}>
            <View style={s.pcFooterLeft}>
              {firstItem ? (
                <Text style={[s.pcItemsText, { color: colors.text }]} numberOfLines={1}>
                  {firstItem.product_name_snapshot}
                  {additionalCount > 0 && (
                    <Text style={{ color: colors.textSecondary, fontWeight: "500", fontSize: 12 }}>
                      {`  + ${additionalCount} more`}
                    </Text>
                  )}
                </Text>
              ) : (
                <Text style={[s.pcItemsText, { color: colors.textSecondary }]}>No items</Text>
              )}
              <Text style={[s.pcDate, { color: colors.textSecondary }]}>
                {fmtDate(item.created_at)}
              </Text>
            </View>
            <View style={s.pcPriceBox}>
              <Text style={[s.pcTotal, { color: colors.text }]}>{'\u20B9'}{total}</Text>
              <Feather name="chevron-right" size={18} color={colors.textSecondary} />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isDark, navigation, statusMeta],
  );

  const renderFooter = useCallback(
    () => (loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={colors.primary} /> : null),
    [loadingMore, colors.primary],
  );

  const FILTERS = ["ALL", "NEW", "PREPARING", "READY", "COMPLETED", "REJECTED"];
  const filterLabels: any = {
    ALL: "All Orders",
    NEW: "Placed",
    PREPARING: "Preparing",
    READY: "Ready",
    COMPLETED: "Delivered",
    REJECTED: "Cancelled"
  };

  const FilterBar = () => (
    <View style={[s.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={[s.searchBox, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
        <Feather name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search Order ID..."
          placeholderTextColor={colors.textSecondary}
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput("")}>
            <Feather name="x-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={s.scrollViewWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillsContainer}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[
                s.pill,
                statusFilter === f
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.background, borderColor: colors.border }
              ]}
            >
              <Text style={[s.pillText, { color: statusFilter === f ? "#FFF" : colors.text }]}>
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  /* ─── Guest State ─── */
  if (!user) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
        <Header />
        <View style={s.emptyWrap}>
          <View style={[s.emptyIcon, { backgroundColor: isDark ? "rgba(5,150,105,0.15)" : "#ECFDF5" }]}>
            <Feather name="shopping-bag" size={40} color={colors.primary} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Sign in to view orders</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Track your live order status, view bills, and reorder easily.
          </Text>
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Login" as any)}
            activeOpacity={0.85}
          >
            <Feather name="log-in" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={s.ctaBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Loading Skeleton ─── */
  if (loading && page === 1 && !refreshing && orders.length === 0 && !searchQuery && statusFilter === "ALL") {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
        <Header />
        <FilterBar />
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} colors={colors} isDark={isDark} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  /* ─── Main View ─── */
  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <Header />
      <FilterBar />
      {orders.length === 0 ? (
        <View style={s.emptyWrap}>
          <View style={[s.emptyIcon, { backgroundColor: isDark ? "rgba(5,150,105,0.2)" : "#ECFDF5", borderColor: isDark ? "rgba(5,150,105,0.4)" : "#A7F3D0" }]}>
            <Feather name="package" size={40} color={colors.primary} />
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>No orders yet</Text>
          <Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
            Once you place an order, it will show up here.
          </Text>
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("HomeTab")}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, idx) => String(item?.id || idx)}
          contentContainerStyle={s.list}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === "android"}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setPage(1); fetchOrders(1, true); }}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={renderItem}
          onEndReached={() => { if (hasMore && !loading && !refreshing && !loadingMore) fetchOrders(page + 1, false, true); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
}

/* ─── Styles ─── */
const s = StyleSheet.create({
  container: { flex: 1 },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },

  /* List */
  list: { padding: 12, paddingBottom: 100 },

  /* Premium Card Styles */
  premiumCard: {
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  pcHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  pcOrderId: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  pcStatusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  pcStatusText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },

  pcImagesRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 66,
    alignItems: "center",
  },
  pcThumbnailShadowBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  pcThumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    borderRadius: 8,
  },
  pcThumbnailExtra: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  pcThumbnailExtraText: {
    fontSize: 13,
    fontWeight: "700",
  },

  pcFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  pcFooterLeft: { flex: 1, paddingRight: 12 },
  pcItemsText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pcDate: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },
  pcPriceBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pcTotal: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },

  /* Search & Filter Bar */
  filterBar: {
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  scrollViewWrap: {
    height: 36,
  },
  pillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  /* Empty / Guest */
  emptyWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, paddingBottom: 60 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 20, maxWidth: 280 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    elevation: 3,
  },
  ctaBtnText: { color: "#FFF", fontSize: 15, fontWeight: "800" },
});
