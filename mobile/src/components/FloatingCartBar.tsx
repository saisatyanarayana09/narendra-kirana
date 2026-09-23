import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Easing,
} from "react-native";

import { useCart } from "../context/CartContext";
import { triggerHaptic } from "../utils/haptics";
import { fixImageUrl, getOptimizedImageUrl } from "../utils/image";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

// Module-level flag: survives component re-mounts. Resets only on full app restart.
let _dismissedThisSession = false;

/** Call this to reset the floating bar (e.g. on logout). */
export function resetFloatingCartBar() {
  _dismissedThisSession = false;
}

interface FloatingCartBarProps {
  bottomOffset: number;
  onPress: () => void;
  onClose: () => void;
  currentRouteName?: string;
}

const HIDE_ON_SCREENS = [
  "ProductDetailScreen",
  "CheckoutScreen",
  "OrderSuccessScreen",
  "OrderTrackingScreen",
  "InvoiceScreen",
  "AddAddressScreen",
  "AddressesScreen",
  "CartScreen",
  "CartTab",
  "ProfileScreen",
  "ProfileTab",
  "WalletScreen",
];

function FloatingCartBarComponent({
  bottomOffset,
  onPress,
  onClose,
  currentRouteName,
}: FloatingCartBarProps) {
  const { cart, storeSettings } = useCart();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasAnimatedIn = useRef(false);

  const { itemCount, totalAmount, isFreeDelivery, shortfall, threshold } =
    useMemo(() => {
      const items = cart?.items || [];
      const count = items.reduce(
        (sum: number, item: any) =>
          sum + (item.quantity > 0 ? item.quantity : 0),
        0,
      );
      const rawSub = items.reduce((sum: number, item: any) => {
        const itemSub = parseFloat(item.subtotal || 0);
        if (itemSub > 0) return sum + itemSub;
        const p =
          typeof item.product === "object" && item.product !== null
            ? item.product
            : {};
        const price = parseFloat(
          item.unit_price || p.offer_price || p.price || p.regular_price || 0,
        );
        return sum + price * (item.quantity || 1);
      }, 0);
      const tot = parseFloat(cart?.items_total || String(rawSub)) || rawSub;
      const thresh =
        parseFloat(storeSettings?.free_delivery_threshold || "200") || 200;
      const free = thresh > 0 && tot >= thresh;
      const short =
        thresh > 0 && !free
          ? Math.max(0, Number((thresh - tot).toFixed(2)))
          : 0;
      return {
        itemCount: count,
        totalAmount: tot,
        isFreeDelivery: free,
        shortfall: short,
        threshold: thresh,
      };
    }, [cart, storeSettings]);

  const cartImages = useMemo(() => {
    const items = cart?.items || [];
    return items
      .map((item: any) => {
        const product = item.product || {};
        const images = product.images || [];
        return images.length > 0
          ? getOptimizedImageUrl(fixImageUrl(images[0]), 100)
          : null;
      })
      .filter(Boolean)
      .slice(0, 3);
  }, [cart]);

  // Slide-in animation on first mount
  useEffect(() => {
    if (itemCount > 0 && !hasAnimatedIn.current) {
      hasAnimatedIn.current = true;
      slideAnim.setValue(60);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: USE_NATIVE_DRIVER,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();
    }
  }, [itemCount, slideAnim, opacityAnim]);

  // Animate Free Delivery progress indicator
  useEffect(() => {
    const targetRatio =
      threshold > 0 ? Math.min(1, Math.max(0, totalAmount / threshold)) : 1;

    Animated.timing(progressAnim, {
      toValue: targetRatio,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [totalAmount, threshold, progressAnim]);

  const dismiss = useCallback(() => {
    _dismissedThisSession = true;
    triggerHaptic("light");
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 60,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      onClose();
    });
  }, [onClose, slideAnim, opacityAnim]);

  const handleViewCart = useCallback(() => {
    _dismissedThisSession = true;
    triggerHaptic("selection");
    onClose();
    onPress();
  }, [onPress, onClose]);

  const handleClose = useCallback(() => {
    dismiss();
  }, [dismiss]);

  // Don't render if already dismissed this session, empty cart, or on excluded screen
  if (
    _dismissedThisSession ||
    itemCount === 0 ||
    (currentRouteName && HIDE_ON_SCREENS.includes(currentRouteName))
  ) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          bottom: bottomOffset,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.container}>
        {/* Main tappable area - View Cart */}
        <Pressable
          onPress={handleViewCart}
          style={styles.mainStrip}
          android_ripple={{ color: "rgba(255,255,255,0.1)" }}
        >
          <View style={styles.leftGroup}>
            <View style={styles.imagesGroup}>
              {cartImages.length > 0 ? (
                cartImages.map((uri, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageWrapper,
                      {
                        zIndex: 3 - index,
                        marginLeft: index > 0 ? -10 : 0,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: uri || undefined }}
                      style={styles.productThumbnail}
                      contentFit="cover"
                      transition={200}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.cartIconCircle}>
                  <Feather name="shopping-bag" size={16} color="#FFFFFF" />
                </View>
              )}
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{itemCount}</Text>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>
                {`₹${(Number(totalAmount) || 0).toFixed(0)}`}
              </Text>
              {threshold > 0 && (
                <Text style={styles.deliveryText} numberOfLines={1}>
                  {isFreeDelivery
                    ? "✓ FREE Delivery"
                    : `Add ₹${(Number(shortfall) || 0).toFixed(0)} for free delivery`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.rightGroup}>
            <Text style={styles.viewCartText}>View Cart</Text>
            <Feather name="chevron-right" size={16} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Progress Bar */}
        {threshold > 0 && (
          <View style={styles.progressTrackContainer}>
            <Animated.View
              style={[
                styles.progressTrackFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                  backgroundColor: isFreeDelivery ? "#34D399" : "#FBBF24",
                },
              ]}
            />
          </View>
        )}

        {/* Close button - OUTSIDE the main Pressable to avoid touch conflicts */}
        <Pressable
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          android_ripple={{ color: "rgba(255,255,255,0.15)", borderless: true, radius: 16 }}
        >
          <Feather name="x" size={14} color="#9CA3AF" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 20,
    pointerEvents: "box-none" as any,
  },
  container: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 12,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.25)" }
      : {}),
  },
  mainStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 44,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  imagesGroup: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  imageWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#374151",
    borderWidth: 2,
    borderColor: "#1F2937",
    overflow: "hidden",
  },
  productThumbnail: {
    width: "100%",
    height: "100%",
  },
  cartIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeCount: {
    position: "absolute",
    top: -5,
    right: -8,
    backgroundColor: "#10B981",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#1F2937",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
  },
  priceContainer: {
    justifyContent: "center",
    flex: 1,
  },
  priceValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  deliveryText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewCartText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrackContainer: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
  },
  progressTrackFill: {
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});

export const FloatingCartBar = React.memo(FloatingCartBarComponent);
