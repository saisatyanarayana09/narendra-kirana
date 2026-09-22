import { Feather } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useState, useRef } from "react";
import { Text, StyleSheet, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "../constants/theme";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const hiddenOffset = -(Math.max(insets.top, 20) + 60);
  const [shouldRender, setShouldRender] = useState(false);
  const slideAnim = useRef(new Animated.Value(hiddenOffset)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? true;

      if (!connected) {
        setShouldRender(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start();
      } else {
        Animated.timing(slideAnim, {
          toValue: hiddenOffset,
          duration: 300,
          useNativeDriver: USE_NATIVE_DRIVER,
        }).start(() => {
          setShouldRender(false);
        });
      }
    });

    return () => unsubscribe();
  }, [slideAnim, hiddenOffset]);

  if (!shouldRender) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          paddingTop: Math.max(insets.top, 16),
        },
      ]}
    >
      <Feather name="wifi-off" size={16} color={theme.colors.surface} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    color: theme.colors.surface,
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 14,
  },
});
