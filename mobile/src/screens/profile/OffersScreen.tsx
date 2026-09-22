import { Feather, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import { AppNavigationProp } from "../../navigation/types";
import { triggerHaptic } from "../../utils/haptics";

interface PromoCodeItem {
  id: number;
  code: string;
  discount_type: "PERCENTAGE" | "FLAT";
  discount_value: string | number;
  min_order_amount: string | number;
  applicable_category?: number | null;
  is_active?: boolean;
  expiration_date?: string | null;
  max_uses_per_user?: number;
  created_at?: string;
}

export function OffersScreen({
  navigation,
}: {
  navigation: AppNavigationProp;
}) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchPromos = useCallback(async () => {
    try {
      const res = await apiClient.get("/offers/promocodes/");
      const raw = Array.isArray(res.data) ? res.data : res.data?.results || [];
      const activeOnly = raw.filter(
        (item: PromoCodeItem) => item.is_active !== false,
      );
      setPromos(activeOnly);
    } catch (error) {
      console.error("Failed to fetch promo codes:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const onRefresh = async () => {
    setRefreshing(true);
    triggerHaptic("light");
    await fetchPromos();
  };

  const handleCopyCode = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      triggerHaptic("success");
      setCopiedCode(code);
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2000);
    } catch {
      // Graceful fallback
    }
  };

  const formatDiscountBadge = (item: PromoCodeItem) => {
    const val = parseFloat(String(item.discount_value)) || 0;
    if (item.discount_type === "PERCENTAGE") {
      return `${Math.round(val)}% OFF`;
    }
    return `FLAT ₹${Math.round(val)} OFF`;
  };

  const formatValidDate = (dateStr?: string | null) => {
    if (!dateStr) return "No expiry";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            triggerHaptic("light");
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("Main");
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={colors.primary} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            {t("back")}
          </Text>
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.text, fontSize: 20 }]}
        >
          {t("offersPromoCodes")}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {t("availableOffers")}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {promos.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Feather name="tag" size={32} color={colors.primaryDark} />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text, fontSize: 17 },
                ]}
              >
                {t("noOffers")}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {t("noOffersSub")}
              </Text>
            </View>
          ) : (
            <View style={styles.couponsList}>
              {promos.map((coupon) => {
                const isCopied = copiedCode === coupon.code;
                const minOrder =
                  parseFloat(String(coupon.min_order_amount)) || 0;

                return (
                  <View
                    key={coupon.id || coupon.code}
                    style={[
                      styles.ticketCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isCopied ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {/* Left Notch */}
                    <View
                      style={[
                        styles.notchLeft,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    {/* Right Notch */}
                    <View
                      style={[
                        styles.notchRight,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    />

                    {/* Ticket Header: Badge & Expiry */}
                    <View style={styles.ticketTopRow}>
                      <View
                        style={[
                          styles.discountBadge,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <MaterialIcons
                          name="local-offer"
                          size={13}
                          color={colors.primaryDark}
                        />
                        <Text
                          style={[
                            styles.discountBadgeText,
                            { color: colors.primaryDark },
                          ]}
                        >
                          {formatDiscountBadge(coupon)}
                        </Text>
                      </View>

                      <View style={styles.expiryRow}>
                        <Feather
                          name="clock"
                          size={12}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.expiryText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("validTill")}
                          {formatValidDate(coupon.expiration_date)}
                        </Text>
                      </View>
                    </View>

                    {/* Middle: Code & Copy Button */}
                    <View
                      style={[
                        styles.codeContainer,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.codeTextGroup}>
                        <Text
                          style={[
                            styles.codeLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          PROMO CODE
                        </Text>
                        <Text
                          style={[
                            styles.couponCode,
                            { color: colors.text, fontSize: 17 },
                          ]}
                          selectable
                        >
                          {coupon.code}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.copyButton,
                          {
                            backgroundColor: isCopied
                              ? colors.primaryDark
                              : colors.primary,
                          },
                        ]}
                        onPress={() => handleCopyCode(coupon.code)}
                        activeOpacity={0.8}
                      >
                        {isCopied ? (
                          <View style={styles.copyBtnInner}>
                            <Feather name="check" size={14} color="#FFFFFF" />
                            <Text style={styles.copyBtnText}>
                              {t("copied")}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.copyBtnInner}>
                            <Feather name="copy" size={14} color="#FFFFFF" />
                            <Text style={styles.copyBtnText}>
                              {t("copyCode")}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Dashed Separator */}
                    <View style={styles.dashedDivider} />

                    {/* Footer Details */}
                    <View style={styles.detailsRow}>
                      <View style={styles.detailItem}>
                        <Feather
                          name="shopping-bag"
                          size={13}
                          color={colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.detailText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {t("minOrder")}
                          {minOrder.toFixed(0)}
                        </Text>
                      </View>

                      {Boolean(
                        coupon.max_uses_per_user &&
                        coupon.max_uses_per_user > 0,
                      ) && (
                        <View style={styles.detailItem}>
                          <Feather
                            name="user-check"
                            size={13}
                            color={colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.detailText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {coupon.max_uses_per_user === 1
                              ? "Once per user"
                              : `Max ${coupon.max_uses_per_user} uses`}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
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
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headerTitle: {
    fontWeight: "900",
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 130,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  couponsList: {
    gap: 16,
  },
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 16,
    position: "relative",
    overflow: "hidden",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.04)",
    elevation: 2,
  },
  notchLeft: {
    position: "absolute",
    left: -12,
    top: "50%",
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  notchRight: {
    position: "absolute",
    right: -12,
    top: "50%",
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  ticketTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expiryText: {
    fontSize: 11,
    fontWeight: "600",
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  codeTextGroup: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  couponCode: {
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  copyButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  copyBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  copyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  dashedDivider: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderStyle: "dashed",
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
