import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { BouncyTouchable } from "../../components/BouncyTouchable";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { AppNavigationProp } from "../../navigation/types";
import {
  getCachedNotificationsSync,
  loadCachedNotifications,
  saveCachedNotifications,
} from "../../services/profileCache";
import { triggerHaptic } from "../../utils/haptics";

type FilterTab = "ALL" | "PROMO" | "ORDER" | "SYSTEM";

export function NotificationsScreen({
  navigation,
}: {
  navigation: AppNavigationProp;
}) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const cachedNotifs = getCachedNotificationsSync(user?.id);
  const [notifications, setNotifications] = useState<any[]>(cachedNotifs || []);
  const [loading, setLoading] = useState(
    !cachedNotifs || cachedNotifs.length === 0,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");

  useEffect(() => {
    if (user) {
      if (notifications.length === 0) {
        loadCachedNotifications(user.id).then((cached) => {
          if (cached && cached.length > 0) {
            setNotifications(cached);
            setLoading(false);
          }
        });
      }
      fetchNotifications();
    } else {
      setNotifications([]);
      setLoading(false);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await apiClient.get("/notifications/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
      setNotifications(list);
      saveCachedNotifications(user.id, list);
    } catch (error) {
      console.error("Failed to load notifications", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (!user) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    fetchNotifications();
  }, [user]);

  const markAsRead = async (id: number) => {
    if (!user) return;
    const target = notifications.find((n) => n.id === id);
    if (!target || target.is_read) return;

    triggerHaptic("selection");
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    try {
      await apiClient.patch(`/notifications/${id}/`, { is_read: true });
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    const unreadList = notifications.filter((n) => !n.is_read);
    if (unreadList.length === 0 || markingAll) return;

    triggerHaptic("success");
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      await Promise.all(
        unreadList.map((n) =>
          apiClient
            .patch(`/notifications/${n.id}/`, { is_read: true })
            .catch(() => null),
        ),
      );
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
      fetchNotifications();
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!user) return;
    triggerHaptic("light");
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      await apiClient.delete(`/notifications/${id}/`);
    } catch (err) {
      console.error("Failed to delete notification", err);
      fetchNotifications();
    }
  };

  const handleAction = (item: any) => {
    markAsRead(item.id);
    const actionUrl = item.action_url || item.data?.action_url || item.data?.url;
    
    if (actionUrl) {
      if (actionUrl.includes("order")) {
        const orderId = actionUrl.split("/").pop();
        if (orderId && !isNaN(Number(orderId))) {
          navigation.navigate("OrderTrackingScreen", { orderId: Number(orderId) });
          return;
        }
        navigation.navigate("Main", { screen: "Orders" } as any);
        return;
      }
      if (actionUrl.includes("product")) {
        const prodId = actionUrl.split("/").pop();
        if (prodId && !isNaN(Number(prodId))) {
          navigation.navigate("ProductDetailScreen", { productId: Number(prodId) });
          return;
        }
      }
    }

    if (item.category === "ORDER") {
      navigation.navigate("Main", { screen: "Orders" } as any);
    } else if (item.category === "PROMO") {
      navigation.navigate("Main", { screen: "Home" } as any);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return "Yesterday";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const getCategoryTheme = (cat?: string) => {
    switch (cat) {
      case "ORDER":
        return {
          icon: "shopping-bag" as const,
          color: "#10B981",
          bgColor: isDark ? "rgba(16, 185, 129, 0.15)" : "#ECFDF5",
          badgeLabel: "ORDER UPDATE",
          actionText: "Track Order",
        };
      case "PROMO":
        return {
          icon: "gift" as const,
          color: "#F59E0B",
          bgColor: isDark ? "rgba(245, 158, 11, 0.15)" : "#FEF3C7",
          badgeLabel: "EXCLUSIVE OFFER",
          actionText: "View Offer",
        };
      case "WALLET":
        return {
          icon: "credit-card" as const,
          color: "#6366F1",
          bgColor: isDark ? "rgba(99, 102, 241, 0.15)" : "#EEF2FF",
          badgeLabel: "WALLET & PAYMENT",
          actionText: "Check Balance",
        };
      default:
        return {
          icon: "bell" as const,
          color: "#0284C7",
          bgColor: isDark ? "rgba(2, 132, 199, 0.15)" : "#E0F2FE",
          badgeLabel: "NOTIFICATION",
          actionText: "View Details",
        };
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === "ALL") return notifications;
    return notifications.filter((n) => {
      const cat = n.category || "SYSTEM";
      if (activeTab === "PROMO") return cat === "PROMO";
      if (activeTab === "ORDER") return cat === "ORDER";
      if (activeTab === "SYSTEM") return cat === "SYSTEM" || cat === "WALLET";
      return true;
    });
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top"]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("Main")
            }
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              Back
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications
          </Text>
        </View>
        <View style={styles.guestStateContainer}>
          <View
            style={[
              styles.guestIconBox,
              {
                backgroundColor: isDark ? "rgba(5, 150, 105, 0.15)" : "#ECFDF5",
              },
            ]}
          >
            <Feather name="bell" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: colors.text }]}>
            Sign In to Access Notifications
          </Text>
          <Text style={[styles.guestSubtitle, { color: colors.textSecondary }]}>
            Stay updated on your live order status, special promotions, and
            instant delivery alerts.
          </Text>
          <TouchableOpacity
            style={[styles.guestSignInBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.85}
          >
            <Feather
              name="log-in"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.guestSignInBtnText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate("Main")
            }
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.primary} />
            <Text style={[styles.backButtonText, { color: colors.primary }]}>
              Back
            </Text>
          </TouchableOpacity>

          {unreadCount > 0 && (
            <TouchableOpacity
              style={[
                styles.markAllReadBtn,
                {
                  backgroundColor: isDark
                    ? "rgba(5, 150, 105, 0.15)"
                    : "#ECFDF5",
                  borderColor: isDark ? "rgba(5, 150, 105, 0.3)" : "#A7F3D0",
                },
              ]}
              onPress={markAllAsRead}
              disabled={markingAll}
              activeOpacity={0.7}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather
                    name="check-circle"
                    size={14}
                    color={colors.primary}
                  />
                  <Text
                    style={[styles.markAllReadText, { color: colors.primary }]}
                  >
                    Mark all read
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Notifications
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Updates about your orders, exclusive offers and alerts.
          </Text>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {[
            { id: "ALL", label: "All" },
            { id: "ORDER", label: "Orders" },
            { id: "PROMO", label: "Offers" },
            { id: "SYSTEM", label: "Alerts" },
          ].map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  triggerHaptic("selection");
                  setActiveTab(tab.id as FilterTab);
                }}
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: isDark
                      ? "rgba(255, 255, 255, 0.05)"
                      : "#F1F5F9",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                  isTabActive && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabChipText,
                    { color: colors.textSecondary },
                    isTabActive && { color: "#FFFFFF", fontWeight: "900" },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item, index) =>
            String(item?.id || item?.uuid || item?.uid || index)
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark
                      ? "rgba(5, 150, 105, 0.2)"
                      : "#D1FAE5",
                  },
                ]}
              >
                <Feather name="bell-off" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No notifications found
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {activeTab === "ALL"
                  ? "You're all caught up! We'll notify you here when updates arrive."
                  : `No ${activeTab.toLowerCase()} notifications right now.`}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isRead = item.is_read;
            const theme = getCategoryTheme(item.category);
            const imageUrl = item.image_url || item.data?.image_url;

            return (
              <BouncyTouchable
                onPress={() => handleAction(item)}
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  !isRead && {
                    backgroundColor: isDark
                      ? "rgba(5, 150, 105, 0.12)"
                      : "#F0FDF4",
                    borderColor: isDark ? "rgba(5, 150, 105, 0.4)" : "#BBF7D0",
                  },
                ]}
              >
                <View style={styles.cardTopBar}>
                  <View style={styles.badgeRow}>
                    {!isRead && <View style={styles.unreadDot} />}
                    <View
                      style={[
                        styles.catIconCircle,
                        { backgroundColor: theme.bgColor },
                      ]}
                    >
                      <Feather
                        name={theme.icon}
                        size={13}
                        color={theme.color}
                      />
                    </View>
                    <Text
                      style={[styles.catBadgeText, { color: theme.color }]}
                    >
                      {theme.badgeLabel}
                    </Text>
                  </View>

                  <View style={styles.metaRight}>
                    <Text
                      style={[styles.dateText, { color: colors.textSecondary }]}
                    >
                      {formatTimeAgo(item.created_at)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => deleteNotification(item.id)}
                      style={styles.deleteBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather
                        name="trash-2"
                        size={14}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title */}
                <Text
                  style={[
                    styles.notifTitle,
                    { color: colors.text },
                    !isRead && { fontWeight: "900" },
                  ]}
                >
                  {item.title}
                </Text>

                {/* Body Message */}
                <Text
                  style={[
                    styles.notifMessage,
                    { color: colors.textSecondary },
                    !isRead && { color: isDark ? "#CBD5E1" : "#334155" },
                  ]}
                >
                  {item.message}
                </Text>

                {/* Rich Image Card Attachment */}
                {imageUrl ? (
                  <View style={styles.imageCardContainer}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.notifImage}
                      contentFit="cover"
                      transition={300}
                    />
                  </View>
                ) : null}

                {/* Action CTA Bar */}
                <View style={styles.ctaRow}>
                  <Text style={[styles.ctaText, { color: colors.primary }]}>
                    {theme.actionText}
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={14}
                    color={colors.primary}
                  />
                </View>
              </BouncyTouchable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  markAllReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  markAllReadText: {
    fontSize: 11,
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guestStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  guestIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  guestSignInBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
  },
  guestSignInBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.04)",
    elevation: 1,
  },
  cardTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  catIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 2,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 4,
  },
  notifMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  imageCardContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    height: 140,
    backgroundColor: "#F1F5F9",
  },
  notifImage: {
    width: "100%",
    height: "100%",
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
