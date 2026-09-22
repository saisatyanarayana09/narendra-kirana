import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Platform,
} from "react-native";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.logoBox}>
          <Image
            source={require("../../assets/logo.jpg")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmerald}>NARENDRA</Text>
          <Text style={styles.brandRed}> KIRANA</Text>
        </View>
        <Text style={styles.tagline}>Fresh Daily Groceries & Essentials</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
    elevation: 4,
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  brandEmerald: {
    fontSize: 16,
    fontWeight: "900",
    color: "#064E3B",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  brandRed: {
    fontSize: 16,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  tagline: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
});
