import { Feather, Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../context/ThemeContext";
import {
  addNotificationReceivedListener,
  getNotifications,
} from "../services/notificationService";
import { triggerHaptic } from "../utils/haptics";
import { navigationRef } from "../navigation/RootNavigator";

const { width } = Dimensions.get("window");

export interface InAppNotifData {
  id?: string;
  title: string;
  body: string;
  imageUrl?: string;
  category?: "ORDER" | "PROMO" | "WALLET" | "SYSTEM";
  actionUrl?: string;
  data?: Record<string, any>;
}

export function InAppNotificationBanner() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeNotif, setActiveNotif] = useState<InAppNotifData | null>(null);

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<any>(null);

  useEffect(() => {
    const subscription = addNotificationReceivedListener((notification) => {
      const content = notification?.request?.content || {};
      const payloadData = content?.data || {};

      const title = content.title || "Notification";
      const body = content.body || "";
      const imageUrl =
        payloadData.image_url || payloadData.image || content.attachments?.[0]?.url;
      const category = payloadData.category || "SYSTEM";
      const actionUrl = payloadData.action_url;

      showBanner({
        title,
        body,
        imageUrl,
        category,
        actionUrl,
        data: payloadData,
      });
    });

    return () => {
      if (subscription && typeof subscription.remove === "function") {
        subscription.remove();
      }
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const showBanner = (notif: InAppNotifData) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);

    setActiveNotif(notif);
    triggerHaptic("success");

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: insets.top + 8,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 5.5 seconds
    hideTimer.current = setTimeout(() => {
      dismissBanner();
    }, 5500);
  };

  const dismissBanner = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setActiveNotif(null);
    });
  };

  if (!activeNotif) return null;

  const getCategoryConfig = (cat?: string) => {
    switch (cat) {
      case "ORDER":
        return {
          icon: "shopping-bag" as const,
          color: "#10B981",
          bgColor: isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5",
          label: "ORDER UPDATE",
        };
      case "PROMO":
        return {
          icon: "gift" as const,
          color: "#F59E0B",
          bgColor: isDark ? "rgba(245, 158, 11, 0.2)" : "#FEF3C7",
          label: "OFFER",
        };
      case "WALLET":
        return {
          icon: "credit-card" as const,
          color: "#6366F1",
          bgColor: isDark ? "rgba(99, 102, 241, 0.2)" : "#EEF2FF",
          label: "WALLET",
        };
      default:
        return {
          icon: "bell" as const,
          color: "#0284C7",
          bgColor: isDark ? "rgba(2, 132, 199, 0.2)" : "#E0F2FE",
          label: "ALERT",
        };
    }
  };

  const handleBannerPress = () => {
    triggerHaptic("selection");
    dismissBanner();

    if (!activeNotif) return;
    const actionUrl = activeNotif.actionUrl || activeNotif.data?.url;

    if (actionUrl) {
      if (actionUrl.includes("order")) {
        const orderId = actionUrl.split("/").pop();
        if (orderId && !isNaN(Number(orderId))) {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate("OrderTrackingScreen", { orderId: Number(orderId) });
          }
          return;
        }
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate("Main", { screen: "Orders" });
        }
        return;
      }
      if (actionUrl.includes("product")) {
        const prodId = actionUrl.split("/").pop();
        if (prodId && !isNaN(Number(prodId))) {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate("ProductDetailScreen", { productId: Number(prodId) });
          }
          return;
        }
      }
    }

    if (activeNotif.category === "ORDER") {
      if (navigationRef.isReady()) {
        (navigationRef as any).navigate("Main", { screen: "Orders" });
      }
    } else if (activeNotif.category === "PROMO") {
      if (navigationRef.isReady()) {
        (navigationRef as any).navigate("Main", { screen: "Home" });
      }
    }
  };

  const catConfig = getCategoryConfig(activeNotif.category);

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
          borderColor: isDark ? "#334155" : "#E2E8F0",
        },
      ]}
    >
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.9}
        onPress={handleBannerPress}
      >
        {activeNotif.imageUrl ? (
          <Image
            source={{ uri: activeNotif.imageUrl }}
            style={styles.imageThumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: catConfig.bgColor },
            ]}
          >
            <Feather name={catConfig.icon} size={20} color={catConfig.color} />
          </View>
        )}

        <View style={styles.textContainer}>
          <View style={styles.badgeRow}>
            <Text style={[styles.categoryBadge, { color: catConfig.color }]}>
              {catConfig.label}
            </Text>
          </View>

          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {activeNotif.title}
          </Text>
          <Text
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {activeNotif.body}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="x" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
    elevation: 10,
    overflow: "hidden",
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  imageThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  body: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
});
