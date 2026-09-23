import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Easing,
} from "react-native";

import { useCart } from "../context/CartContext";
import { triggerHaptic } from "../utils/haptics";
import { fixImageUrl, getOptimizedImageUrl } from "../utils/image";

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const [isDismissed, setIsDismissed] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const { itemCount, totalAmount, isFreeDelivery, shortfall, threshold } = useMemo(() => {
    const items = cart?.items || [];
    const count = items.reduce(
      (sum: number, item: any) => sum + (item.quantity > 0 ? item.quantity : 0),
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
    const thresh = parseFloat(storeSettings?.free_delivery_threshold || "200") || 200;
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
        return images.length > 0 ? getOptimizedImageUrl(fixImageUrl(images[0]), 100) : null;
      })
      .filter(Boolean)
      .slice(0, 3);
  }, [cart]);

  const prevItemCountRef = useRef(itemCount);

  const handleOpenCart = useCallback(() => {
    triggerHaptic("selection");
    onPress();
  }, [onPress]);

  const handleDismiss = useCallback(() => {
    triggerHaptic("light");
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start(() => {
      setIsDismissed(true);
      onClose();
    });
  }, [onClose, slideAnim, opacityAnim]);

  useEffect(() => {
    if (itemCount > 0) {
      if (prevItemCountRef.current === 0) {
        // Initial entrance from bottom
        slideAnim.setValue(40);
        opacityAnim.setValue(0);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: USE_NATIVE_DRIVER,
            tension: 70,
            friction: 9,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]).start();
      }
      prevItemCountRef.current = itemCount;
    } else {
      prevItemCountRef.current = itemCount;
    }
  }, [itemCount, slideAnim, opacityAnim]);

  // Animate Free Delivery progress indicator
  useEffect(() => {
    const targetRatio =
      threshold > 0
        ? Math.min(1, Math.max(0, totalAmount / threshold))
        : 1;
        
    Animated.timing(progressAnim, {
      toValue: targetRatio,
      duration: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false, // Must be false for width interpolation
    }).start();
  }, [totalAmount, threshold, progressAnim]);

  if (
    isDismissed ||
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
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleOpenCart}
        style={styles.container}
      >
        <View style={styles.mainStrip}>
          <View style={styles.leftGroup}>
            <View style={styles.imagesGroup}>
              {cartImages.length > 0 ? (
                cartImages.map((uri, index) => (
                  <View
                    key={index}
                    style={[
                      styles.imageWrapper,
                      { zIndex: 3 - index, marginLeft: index > 0 ? -12 : 0 },
                    ]}
                  >
                    <Image
                      source={{ uri }}
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
                {`₹${(Number(totalAmount) || 0).toFixed(2)}`}
              </Text>
              {threshold > 0 && (
                <Text style={styles.progressRatioText}>
                  {isFreeDelivery
                    ? "FREE Delivery"
                    : `Add ₹${(Number(shortfall) || 0).toFixed(0)} for FREE Delivery`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.rightGroup}>
            <Text style={styles.viewCartText}>View Cart</Text>
            <Feather name="chevron-right" size={16} color="#FFFFFF" />
          </View>
        </View>

        {/* Minimal Progress Bar */}
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

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
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
    backgroundColor: "#1F2937", // Clean, minimal dark gray
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.2)",
    elevation: 12,
  },
  mainStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 40, // Space for the close button
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imagesGroup: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    marginRight: 4,
  },
  imageWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#374151",
    borderWidth: 2,
    borderColor: "#1F2937",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  productThumbnail: {
    width: "100%",
    height: "100%",
  },
  cartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeCount: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: "#10B981",
    borderRadius: 10,
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
  },
  priceValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  progressRatioText: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
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
    letterSpacing: 0.2,
  },
  progressTrackContainer: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    width: "100%",
  },
  progressTrackFill: {
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});

export const FloatingCartBar = React.memo(FloatingCartBarComponent);
