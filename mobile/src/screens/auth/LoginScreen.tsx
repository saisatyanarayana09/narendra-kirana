import { Feather, AntDesign } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { GoogleSignin } from "../../utils/GoogleSigninWrapper";

GoogleSignin.configure({
  webClientId:
    "729937153109-6e8fivp20b3ri2qsah1d6u2a7oi0uls6.apps.googleusercontent.com",
  offlineAccess: false,
});

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Login">;
  route?: RouteProp<AuthStackParamList, "Login">;
};

export function LoginScreen({ navigation, route }: Props) {
  const { colors, isDark } = useTheme();
  const { loginWithGoogle, pendingRedirect, clearPendingRedirect } = useAuth();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrerName, setReferrerName] = useState<string>("");
  const [isLookingUpReferral, setIsLookingUpReferral] = useState(false);

  // 1. Detect referral code from params or clipboard
  useEffect(() => {
    const rawParam = route?.params?.referral_code || route?.params?.ref;
    if (rawParam && typeof rawParam === "string") {
      const code = rawParam.trim().toUpperCase();
      setReferralCode(code);
      lookupReferrer(code);
      return;
    }

    // Auto-detect referral code from clipboard
    Clipboard.getStringAsync()
      .then((clip) => {
        const trimmed = (clip || "").trim();
        if (/^[A-Za-z0-9]{5,12}$/.test(trimmed)) {
          const code = trimmed.toUpperCase();
          setReferralCode(code);
          lookupReferrer(code);
        }
      })
      .catch(() => {});
  }, [route?.params]);

  const lookupReferrer = async (code: string) => {
    if (!code) return;
    setIsLookingUpReferral(true);
    try {
      const res = await apiClient.get(
        `/auth/referral-lookup/?code=${encodeURIComponent(code)}`,
      );
      if (res.data?.referrer_name) {
        setReferrerName(res.data.referrer_name);
      }
    } catch {
      // Invalid code or unresolvable
    } finally {
      setIsLookingUpReferral(false);
    }
  };

  const processRedirect = () => {
    if (pendingRedirect) {
      const { screen, tab, params } = pendingRedirect;
      clearPendingRedirect();
      if (tab) {
        (navigation as any).navigate("Main", {
          screen: tab,
          params: { screen, params },
        });
      } else {
        (navigation as any).navigate(screen as any, params);
      }
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate("Main" as any);
    }
  };

  const handleGoogleLogin = async () => {
    if (Platform.OS === "web") {
      Alert.alert(
        "Web Authentication",
        "Please use the Web browser portal for Google Sign-In on Web.",
      );
      return;
    }

    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore if no prior account was cached
      }
      const response = await GoogleSignin.signIn();
      const idToken =
        (response as any).data?.idToken || (response as any).idToken;
      if (idToken) {
        await loginWithGoogle(idToken, referralCode);
        processRedirect();
      } else {
        throw new Error("No ID token present!");
      }
    } catch (error: any) {
      if (error?.code === "SIGN_IN_CANCELLED" || error?.code === "12501") {
        return;
      }
      console.error("Google Signin Error:", error);
      const backendDetail =
        error.response?.data?.detail || error.response?.data?.error;
      const errorMsg = backendDetail
        ? backendDetail
        : error.code === "10" ||
            String(error.message).includes("DEVELOPER_ERROR")
          ? "Google Sign-In configuration error (Code 10). The APK SHA-1 fingerprint needs to be registered in Google Cloud Console."
          : error.message || "Something went wrong.";

      Alert.alert("Google Sign-In Failed", errorMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={["top", "bottom"]}
    >
      <KeyboardAwareScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
      >
        {/* Header Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() =>
            navigation.canGoBack()
              ? navigation.goBack()
              : (navigation as any).navigate("Main")
          }
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" color={colors.primary} size={18} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            Back
          </Text>
        </TouchableOpacity>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Image
              source={require("../../../assets/narendra-logo-tight.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>
              <Text style={[styles.brandSlate, { color: colors.text }]}>
                Narendra{" "}
              </Text>
              <Text style={styles.brandRed}>Kirana</Text>
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Quick Sign-In
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Fresh groceries & daily essentials delivered right to your door.
          </Text>
        </View>

        {/* Pending Action Redirect Banner (e.g. from Checkout or Orders) */}
        {pendingRedirect && (
          <View
            style={[
              styles.redirectBanner,
              {
                backgroundColor: isDark ? "rgba(5, 150, 105, 0.15)" : "#ECFDF5",
                borderColor: isDark ? "rgba(5, 150, 105, 0.3)" : "#A7F3D0",
              },
            ]}
          >
            <Feather name="lock" color={colors.primary} size={15} />
            <Text
              style={[
                styles.redirectBannerText,
                { color: isDark ? "#34D399" : "#065F46" },
              ]}
            >
              {pendingRedirect.screen === "InvoiceScreen"
                ? `Sign in to view Order #${pendingRedirect.params?.orderId || ""} invoice`
                : pendingRedirect.screen === "OrderTrackingScreen"
                  ? `Sign in to track Order #${pendingRedirect.params?.orderId || ""}`
                  : pendingRedirect.screen === "OrderHistoryScreen"
                    ? "Sign in to view your order history"
                    : "Sign in to complete your checkout"}
            </Text>
          </View>
        )}

        {/* Personalized Referral Invite Banner */}
        {referralCode ? (
          <View
            style={[
              styles.referralBanner,
              {
                backgroundColor: isDark ? "rgba(13, 148, 136, 0.15)" : "#F0FDFA",
                borderColor: isDark ? "rgba(13, 148, 136, 0.3)" : "#99F6E4",
              },
            ]}
          >
            <View style={styles.referralIconBox}>
              <Feather name="gift" size={20} color="#0D9488" />
            </View>
            <View style={{ flex: 1 }}>
              {isLookingUpReferral ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ActivityIndicator size="small" color="#0D9488" />
                  <Text style={[styles.referralSubtitle, { color: colors.textSecondary }]}>
                    Validating invitation code...
                  </Text>
                </View>
              ) : referrerName ? (
                <>
                  <Text style={[styles.referralTitle, { color: isDark ? "#2DD4BF" : "#0F766E" }]}>
                    Invited by <Text style={{ fontWeight: "900" }}>{referrerName}</Text>! 🎉
                  </Text>
                  <Text style={[styles.referralSubtitle, { color: isDark ? "#99F6E4" : "#115E59" }]}>
                    Sign in with Google to claim your exclusive welcome discount.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.referralTitle, { color: isDark ? "#2DD4BF" : "#0F766E" }]}>
                    Referral Code Applied: {referralCode} 🎁
                  </Text>
                  <Text style={[styles.referralSubtitle, { color: isDark ? "#99F6E4" : "#115E59" }]}>
                    Sign in with Google to receive your referral reward.
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* Central Auth Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardHeaderTitle, { color: colors.text }]}>
            Continue with Google
          </Text>
          <Text style={[styles.cardHeaderSubtitle, { color: colors.textSecondary }]}>
            No password required. Instant 1-tap sign-in and account setup.
          </Text>

          {/* 1-Tap Google Button */}
          <TouchableOpacity
            style={[
              styles.googleButton,
              isDark
                ? { backgroundColor: "#1E293B", borderColor: "#334155" }
                : { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" },
            ]}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            activeOpacity={0.8}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#4285F4" size="small" />
            ) : (
              <>
                <AntDesign
                  name="google"
                  color="#4285F4"
                  size={22}
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={[
                    styles.googleButtonText,
                    { color: isDark ? "#F8FAFC" : "#1E293B" },
                  ]}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Value Props / Perks */}
          <View style={styles.perksContainer}>
            <View style={styles.perkRow}>
              <Feather name="check-circle" size={16} color="#10B981" />
              <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                Instant setup with your verified Google account
              </Text>
            </View>
            <View style={styles.perkRow}>
              <Feather name="shield" size={16} color="#10B981" />
              <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                100% Secure — no passwords to remember or lose
              </Text>
            </View>
            <View style={styles.perkRow}>
              <Feather name="zap" size={16} color="#10B981" />
              <Text style={[styles.perkText, { color: colors.textSecondary }]}>
                Automatic wallet & cashbacks on every order
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Terms */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By continuing, you agree to our Terms of Service & Privacy Policy.
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  brandSlate: {
    fontWeight: "900",
  },
  brandRed: {
    color: "#E11D48",
    fontWeight: "900",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  redirectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  redirectBannerText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    shadowColor: "#0D9488",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  referralIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(13, 148, 136, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  referralTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  referralSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  cardHeaderSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    shadowColor: "#4285F4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  perksContainer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    gap: 12,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  perkText: {
    fontSize: 12.5,
    fontWeight: "500",
    flex: 1,
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
  },
});
