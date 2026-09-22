import { Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { AppNavigationProp } from "../../navigation/types";
import { triggerHaptic } from "../../utils/haptics";

export function ProfileScreen({
  navigation,
}: {
  navigation: AppNavigationProp;
}) {
  const { user, logout, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [referralCount, setReferralCount] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProfileData();
    });
    loadProfileData();
    return unsubscribe;
  }, [navigation, user]);

  const loadProfileData = async () => {
    if (!user) {
      setWalletBalance(0);
      setReferralCount(0);
      return;
    }
    try {
      refreshUser?.();
      const [walletRes, refRes] = await Promise.all([
        apiClient.get("/auth/wallet/").catch(() => ({ data: { balance: 0 } })),
        apiClient.get("/offers/referrals/").catch(() => ({ data: [] })),
      ]);
      setWalletBalance(parseFloat(walletRes.data?.balance || 0));
      const refs = Array.isArray(refRes.data)
        ? refRes.data
        : refRes.data?.results || [];
      setReferralCount(refs.length);
    } catch {
      // Ignore background fetch error
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    triggerHaptic("light");
    await loadProfileData();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    triggerHaptic("medium");
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to sign out?")) {
        logout();
      }
      return;
    }

    Alert.alert(t("logout"), "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: t("logout"),
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const getInitials = () => {
    if (user?.first_name) {
      const parts = user.first_name.trim().split(" ");
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.first_name.slice(0, 2).toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "NK";
  };

  const orderCards = [
    {
      key: "yourOrders",
      name: t("yourOrders"),
      desc: t("yourOrdersDesc"),
      icon: "package" as const,
      isRupee: false,
      color: "#2563EB", // blue-600
      bg: "#EFF6FF", // blue-50
      isProtected: true,
      onPress: () => navigation.navigate("OrderHistoryScreen"),
    },
    {
      key: "wallet",
      name: t("wallet"),
      desc: t("walletDesc"),
      icon: "currency-rupee" as const,
      isRupee: true, // Use Indian Rupee symbol
      color: "#059669", // emerald-600
      bg: "#ECFDF5", // emerald-50
      isProtected: true,
      badge: walletBalance > 0 ? `₹${walletBalance.toFixed(0)}` : undefined,
      onPress: () => navigation.navigate("WalletScreen"),
    },
    {
      key: "referAndEarn",
      name: t("referAndEarn"),
      desc: t("referAndEarnDesc"),
      icon: "gift" as const,
      isRupee: false,
      color: "#0D9488", // teal-600
      bg: "#F0FDFA", // teal-50
      isProtected: true,
      onPress: () => navigation.navigate("ReferAndEarnScreen"),
    },
    {
      key: "offers",
      name: t("offersPromoCodes"),
      desc: t("offersDesc"),
      icon: "tag" as const,
      isRupee: false,
      color: "#8B5CF6", // violet-600
      bg: "#F5F3FF", // violet-50
      isProtected: true,
      onPress: () => navigation.navigate("OffersScreen"),
    },
  ];

  const preferenceCards = [
    {
      key: "savedAddresses",
      name: t("savedAddresses"),
      desc: t("savedAddressesDesc"),
      icon: "map-pin" as const,
      isRupee: false,
      color: "#D97706", // amber-600
      bg: "#FFFBEB", // amber-50
      isProtected: true,
      onPress: () => navigation.navigate("AddressesScreen"),
    },
    {
      key: "favorites",
      name: t("favorites"),
      desc: t("favoritesDesc"),
      icon: "heart" as const,
      isRupee: false,
      color: "#E11D48", // rose-600
      bg: "#FFF1F2", // rose-50
      isProtected: true,
      onPress: () => navigation.navigate("FavoritesScreen"),
    },
    {
      key: "language",
      name: language === "te" ? "భాష / Language" : "Language / భాష",
      desc: t("languagesDesc"),
      icon: "globe" as const,
      isRupee: false,
      badge: language === "te" ? "తెలుగు" : "English",
      color: "#0284C7", // sky-600
      bg: "#F0F9FF", // sky-50
      isProtected: false,
      onPress: () => navigation.navigate("LanguageScreen"),
    },
    {
      key: "notifications",
      name: t("notifications"),
      desc: t("notificationsDesc"),
      icon: "bell" as const,
      isRupee: false,
      color: "#4F46E5", // indigo-600
      bg: "#EEF2FF", // indigo-50
      isProtected: true,
      onPress: () => navigation.navigate("NotificationsScreen"),
    },
    {
      key: "accountSettings",
      name: t("accountSettings"),
      desc: t("accountSettingsDesc"),
      icon: "user" as const,
      isRupee: false,
      color: "#059669", // primary-600
      bg: "#ECFDF5", // primary-50
      isProtected: true,
      onPress: () => navigation.navigate("AccountSettingsScreen"),
    },
    {
      key: "appSettings",
      name: t("appSettings"),
      desc: t("appSettingsDesc"),
      icon: "sliders" as const,
      isRupee: false,
      color: "#475569", // slate-600
      bg: "#F1F5F9", // slate-100
      isProtected: false,
      onPress: () => navigation.navigate("AppSettingsScreen"),
    },
  ];

  const displayName = user?.first_name || user?.username || "Customer";

  const handleCardPress = (card: {
    name: string;
    isProtected?: boolean;
    onPress: () => void;
    [key: string]: any;
  }) => {
    triggerHaptic("light");
    if (!user && card.isProtected) {
      Alert.alert("Sign In Required", "Please sign in to access " + card.name, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign In",
          onPress: () => navigation.navigate("Login" as any),
        },
      ]);
      return;
    }
    card.onPress();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#059669"]}
            tintColor="#059669"
          />
        }
      >
        {/* Improved Customer Name Hero Background */}
        <LinearGradient
          colors={["#064E3B", "#065F46", "#047857"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.customerHeroCard}
        >
          {/* Decorative Corner Glow */}
          <View style={styles.heroDecorativeCircle} />

          {/* Back Button at Top Left (Replaces 'Verified Smart Customer') */}
          <TouchableOpacity
            style={styles.heroBackButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => {
              triggerHaptic("light");
              if (navigation.canGoBack()) {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("Main");
                }
              } else {
                navigation.navigate("HomeTab");
              }
            }}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.heroBackButtonText}>{t("back")}</Text>
          </TouchableOpacity>

          {/* Avatar & Customer Greeting */}
          <View style={styles.customerInfoRow}>
            <View style={styles.avatarCircle}>
              {user ? (
                <Text style={styles.avatarText}>{getInitials()}</Text>
              ) : (
                <Feather name="user" size={26} color="#059669" />
              )}
            </View>
            <View style={styles.greetingBox}>
              <Text style={styles.greetingTitle}>
                {user ? `Hi, ${displayName}!` : "Welcome, Guest!"}
              </Text>
              <Text style={styles.greetingSubtitle} numberOfLines={1}>
                {user
                  ? user?.email ||
                    (user?.phone_number
                      ? `+91 ${user.phone_number}`
                      : "Manage your account and track orders")
                  : "Sign in to track orders, earn cashbacks & more"}
              </Text>
              {!user && (
                <TouchableOpacity
                  style={styles.guestPillBtn}
                  onPress={() => {
                    triggerHaptic("light");
                    navigation.navigate("Login" as any);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.guestPillBtnText}>
                    Sign In / Register
                  </Text>
                  <Feather name="arrow-right" size={13} color="#065F46" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Loyalty & Quick Stats Strip: 2 Balanced Interactive Tiles */}
          <View
            style={[
              styles.loyaltyCard,
              isDark && { backgroundColor: colors.surface },
            ]}
          >
            <TouchableOpacity
              style={styles.loyaltyItem}
              onPress={() => {
                triggerHaptic("light");
                if (!user) {
                  Alert.alert(
                    "Sign In Required",
                    "Please sign in to access " + t("wallet"),
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Sign In",
                        onPress: () => navigation.navigate("Login" as any),
                      },
                    ],
                  );
                  return;
                }
                navigation.navigate("WalletScreen");
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.loyaltyIconBadge,
                  isDark && { backgroundColor: colors.inputBg },
                ]}
              >
                <MaterialIcons
                  name="currency-rupee"
                  size={16}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.loyaltyValue,
                  isDark && { color: colors.primary },
                ]}
              >
                ₹{(walletBalance || 0).toFixed(2)}
              </Text>
              <Text
                style={[
                  styles.loyaltyLabel,
                  isDark && { color: colors.textSecondary },
                ]}
              >
                {t("wallet")}
              </Text>
            </TouchableOpacity>

            <View
              style={[
                styles.loyaltyDivider,
                isDark && { backgroundColor: colors.border },
              ]}
            />

            <TouchableOpacity
              style={styles.loyaltyItem}
              onPress={() => {
                triggerHaptic("light");
                if (!user) {
                  Alert.alert(
                    "Sign In Required",
                    "Please sign in to access " + t("referAndEarn"),
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Sign In",
                        onPress: () => navigation.navigate("Login" as any),
                      },
                    ],
                  );
                  return;
                }
                navigation.navigate("ReferAndEarnScreen");
              }}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.loyaltyIconBadge,
                  { backgroundColor: isDark ? colors.inputBg : "#F0FDFA" },
                ]}
              >
                <Feather name="gift" size={15} color="#0D9488" />
              </View>
              <Text style={[styles.loyaltyValue, { color: "#0D9488" }]}>
                {referralCount}
              </Text>
              <Text
                style={[
                  styles.loyaltyLabel,
                  isDark && { color: colors.textSecondary },
                ]}
              >
                {t("referAndEarn")}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Section 1: Orders & Rewards */}
        <View style={styles.sectionWrapper}>
          <Text
            style={[styles.sectionHeading, { color: colors.textSecondary }]}
          >
            ORDERS & WALLET
          </Text>
          <View style={styles.cardsGrid}>
            {orderCards.map((card, idx) => (
              <TouchableOpacity
                key={card.key || idx}
                style={[
                  styles.cardItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleCardPress(card)}
                activeOpacity={0.75}
              >
                <View style={styles.cardLeftGroup}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isDark ? colors.inputBg : card.bg },
                    ]}
                  >
                    {card.isRupee ? (
                      <MaterialIcons
                        name="currency-rupee"
                        size={20}
                        color={card.color}
                      />
                    ) : (
                      <Feather
                        name={card.icon as any}
                        size={20}
                        color={card.color}
                      />
                    )}
                  </View>
                  <View style={styles.cardTextGroup}>
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: colors.text, fontSize: 15 },
                        ]}
                      >
                        {card.name}
                      </Text>
                      {Boolean((card as any).badge) && (
                        <View
                          style={[
                            styles.langBadge,
                            isDark && {
                              backgroundColor: "rgba(56, 189, 248, 0.15)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.langBadgeText,
                              isDark && { color: "#38BDF8" },
                            ]}
                          >
                            {(card as any).badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.cardDesc, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {card.desc}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.chevronCircle,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section 2: Preferences & Account Settings */}
        <View style={styles.sectionWrapper}>
          <Text
            style={[styles.sectionHeading, { color: colors.textSecondary }]}
          >
            PREFERENCES & ACCOUNT
          </Text>
          <View style={styles.cardsGrid}>
            {preferenceCards.map((card, idx) => (
              <TouchableOpacity
                key={card.key || idx}
                style={[
                  styles.cardItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleCardPress(card)}
                activeOpacity={0.75}
              >
                <View style={styles.cardLeftGroup}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isDark ? colors.inputBg : card.bg },
                    ]}
                  >
                    {card.isRupee ? (
                      <MaterialIcons
                        name="currency-rupee"
                        size={20}
                        color={card.color}
                      />
                    ) : (
                      <Feather
                        name={card.icon as any}
                        size={20}
                        color={card.color}
                      />
                    )}
                  </View>
                  <View style={styles.cardTextGroup}>
                    <View style={styles.cardTitleRow}>
                      <Text
                        style={[
                          styles.cardTitle,
                          { color: colors.text, fontSize: 15 },
                        ]}
                      >
                        {card.name}
                      </Text>
                      {Boolean((card as any).badge) && (
                        <View style={styles.langBadge}>
                          <Text style={styles.langBadgeText}>
                            {(card as any).badge}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[styles.cardDesc, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {card.desc}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.chevronCircle,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionWrapper}>
          {/* Quick Action Logout Tile or Sign In Tile at the Bottom */}
          {user ? (
            <TouchableOpacity
              style={[
                styles.cardItem,
                styles.logoutCardItem,
                {
                  backgroundColor: colors.surface,
                  borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FEE2E2",
                },
              ]}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <View style={styles.cardLeftGroup}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(239, 68, 68, 0.15)"
                        : "#FFF1F2",
                    },
                  ]}
                >
                  <Feather name="log-out" size={20} color="#E11D48" />
                </View>
                <View style={styles.cardTextGroup}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: "#E11D48", fontSize: 15 },
                    ]}
                  >
                    {t("logout")}
                  </Text>
                  <Text
                    style={[styles.cardDesc, { color: colors.textSecondary }]}
                  >
                    {t("logoutDesc")}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.chevronCircle,
                  isDark && { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                ]}
              >
                <Feather name="chevron-right" size={16} color="#E11D48" />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.cardItem,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => {
                triggerHaptic("light");
                navigation.navigate("Login" as any);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.cardLeftGroup}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: isDark
                        ? "rgba(5, 150, 105, 0.15)"
                        : "#ECFDF5",
                    },
                  ]}
                >
                  <Feather name="log-in" size={20} color="#059669" />
                </View>
                <View style={styles.cardTextGroup}>
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: colors.primary, fontSize: 15 },
                    ]}
                  >
                    Sign In / Register
                  </Text>
                  <Text
                    style={[styles.cardDesc, { color: colors.textSecondary }]}
                  >
                    Sign in to your account for full access
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.chevronCircle,
                  { backgroundColor: colors.background },
                ]}
              >
                <Feather
                  name="chevron-right"
                  size={16}
                  color={colors.primary}
                />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Narendra Kirana App v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC", // slate-50 matching web
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 130,
  },
  customerHeroCard: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    boxShadow: "0px 6px 12px rgba(6, 78, 59, 0.22)",
    elevation: 4,
    position: "relative",
    overflow: "hidden",
  },
  heroDecorativeCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    pointerEvents: "none" as any,
  },
  heroBackButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 14,
  },
  heroBackButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  customerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.15)",
    elevation: 3,
  },
  avatarText: {
    color: "#065F46",
    fontSize: 19,
    fontWeight: "900",
  },
  greetingBox: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  greetingSubtitle: {
    fontSize: 12,
    color: "rgba(236, 253, 245, 0.85)",
    marginTop: 2,
    fontWeight: "500",
  },
  guestPillBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginTop: 8,
    boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.1)",
    elevation: 2,
  },
  guestPillBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#065F46",
  },
  loyaltyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.08)",
    elevation: 3,
  },
  loyaltyItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 6,
  },
  loyaltyIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  loyaltyValue: {
    fontSize: 16,
    fontWeight: "900",
    color: "#059669",
    letterSpacing: -0.3,
  },
  loyaltyLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "700",
    marginTop: 2,
  },
  loyaltyDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#F1F5F9",
  },
  sectionWrapper: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  cardsGrid: {
    gap: 10,
  },
  cardItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.03)",
    elevation: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 64,
  },
  logoutCardItem: {
    borderColor: "#FFE4E6",
    backgroundColor: "#FFFDFD",
    marginTop: 6,
  },
  loginCardItem: {
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
    marginTop: 6,
  },
  cardLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTextGroup: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  langBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  langBadgeText: {
    color: "#0284C7",
    fontSize: 11,
    fontWeight: "800",
  },
  cardDesc: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  versionText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 24,
    fontWeight: "600",
  },
});
