import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

interface OtaLaunchScreenProps {
  onSkip?: () => void;
  statusMessage?: string;
  title?: string;
  subtitle?: string;
}

export function OtaLaunchScreen({
  onSkip,
  statusMessage = "Installing updates seamlessly...",
  title = "Updating Narendra Kirana",
  subtitle = "Downloading the latest improvements & offers...",
}: OtaLaunchScreenProps) {
  const [showSkip, setShowSkip] = useState(false);

  let themeColors = theme.colors;
  try {
    const t = useTheme();
    if (t?.colors) themeColors = t.colors;
  } catch {}

  const bgPrimaryDark = themeColors.primaryDark || themeColors.primary;
  const accentColor = themeColors.accent || "#FDE047";
  const lightSubColor = themeColors.primaryLight || "#A7F3D0";

  useEffect(() => {
    // Show a graceful "Skip & Open App" button if download takes > 4 seconds
    const timer = setTimeout(() => {
      setShowSkip(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgPrimaryDark }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgPrimaryDark} />

      <View style={styles.content}>
        {/* Brand Icon */}
        <View style={styles.iconCircle}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.subtitle, { color: lightSubColor }]}>{subtitle}</Text>

        {/* Loading Indicator */}
        <View style={styles.indicatorRow}>
          <ActivityIndicator size="small" color={accentColor} />
          <Text style={[styles.statusText, { color: accentColor }]}>{statusMessage}</Text>
        </View>

        {/* Skip button if slow network */}
        {showSkip && onSkip && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipButtonText, { color: lightSubColor }]}>Skip & Open App</Text>
            <Feather name="arrow-right" size={14} color={lightSubColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Ready in just a moment</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#064E3B",
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryDark,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    boxShadow: "0px 6px 10px rgba(0, 0, 0, 0.25)",
    elevation: 8,
    overflow: "hidden",
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#A7F3D0",
    textAlign: "center",
    marginBottom: 28,
  },
  indicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 10,
  },
  statusText: {
    color: "#FDE047",
    fontSize: 13,
    fontWeight: "700",
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 28,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  skipButtonText: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    paddingBottom: 24,
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontWeight: "500",
  },
});
