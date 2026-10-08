import { Feather, AntDesign } from "@expo/vector-icons";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Animated,
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Manual referral input
  const [showManualReferral, setShowManualReferral] = useState(false);
  const [manualCode, setManualCode] = useState("");

  // Mandatory mobile number prompt modal
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [pendingIdToken, setPendingIdToken] = useState("");
  const [pendingTokenType, setPendingTokenType] = useState("id_token");
  const [isSubmittingPhone, setIsSubmittingPhone] = useState(false);

  // Detect referral code: params -> clipboard -> IP attribution
  useEffect(() => {
    const rawParam = route?.params?.referral_code || route?.params?.ref;
    if (rawParam && typeof rawParam === "string") {
      const code = rawParam.trim().toUpperCase();
      setReferralCode(code);
      lookupReferrer(code);
      return;
    }

    // Layer 3: Auto-detect from clipboard
    Clipboard.getStringAsync()
      .then((clip) => {
        const trimmed = (clip || "").trim();
        if (/^[A-Za-z0-9]{5,12}$/.test(trimmed)) {
          const code = trimmed.toUpperCase();
          setReferralCode(code);
          lookupReferrer(code);
          return;
        }
        // Layer 2: IP lookup fallback if clipboard empty
        checkIpReferral();
      })
      .catch(() => {
        checkIpReferral();
      });
  }, [route?.params]);

  const checkIpReferral = () => {
    apiClient
      .get("/auth/referral-lookup/?ip=true")
      .then((res) => {
        if (res.data?.referral_code) {
          setReferralCode(res.data.referral_code);
          setReferrerName(res.data.referrer_name || "");
        }
      })
      .catch(() => {});
  };

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
      // Invalid code
    } finally {
      setIsLookingUpReferral(false);
    }
  };

  const handleApplyManualCode = () => {
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    setReferralCode(clean);
    lookupReferrer(clean);
    setShowManualReferral(false);
    setManualCode("");
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
    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore cached account
      }
      const response = await GoogleSignin.signIn();
      const idToken =
        (response as any).data?.idToken || (response as any).idToken;
      const tokenType =
        (response as any).data?.tokenType ||
        (response as any).tokenType ||
        "id_token";

      if (!idToken) {
        throw new Error("No ID token present");
      }

      const result = await loginWithGoogle(idToken, referralCode, tokenType);

      // If backend requires mobile number for a new account
      if (result?.requires_mobile) {
        setPendingIdToken(idToken);
        setPendingTokenType(tokenType);
        if (result.referral_code && !referralCode) {
          setReferralCode(result.referral_code);
          lookupReferrer(result.referral_code);
        }
        setShowMobileModal(true);
        return;
      }

      processRedirect();
    } catch (error: any) {
      if (error?.code === "SIGN_IN_CANCELLED" || error?.code === "12501") {
        return;
      }
      console.error("Google Signin Error:", error);
      const backendDetail =
        error.response?.data?.detail || error.response?.data?.error;
      const errorMsg = backendDetail
        ? backendDetail
        : error.message || "Something went wrong.";

      Alert.alert("Sign in failed", errorMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleMobileSubmit = async () => {
    const clean = mobileNumber.replace(/\D/g, "");
    let digits = clean;
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.slice(2);
    }
    if (digits.length !== 10 || !["6", "7", "8", "9"].includes(digits[0])) {
      setMobileError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setMobileError("");
    setIsSubmittingPhone(true);

    try {
      await loginWithGoogle(
        pendingIdToken,
        referralCode,
        pendingTokenType,
        digits,
      );
      setShowMobileModal(false);
      processRedirect();
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to verify phone number.";
      setMobileError(msg);
    } finally {
      setIsSubmittingPhone(false);
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
          <Text style={[styles.title, { color: colors.text }]}>Sign in</Text>
        </View>

        {/* Redirect Notice */}
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
            <Feather name="lock" color={colors.primary} size={14} />
            <Text
              style={[
                styles.redirectBannerText,
                { color: isDark ? "#34D399" : "#065F46" },
              ]}
            >
              Sign in to continue
            </Text>
          </View>
        )}

        {/* Minimal Referral Chip */}
        {referralCode ? (
          <View
            style={[
              styles.referralBanner,
              {
                backgroundColor: isDark ? "rgba(13, 148, 136, 0.15)" : "#ECFDF5",
                borderColor: isDark ? "rgba(13, 148, 136, 0.3)" : "#A7F3D0",
              },
            ]}
          >
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
              <Feather name="tag" size={13} color="#059669" style={{ marginRight: 6 }} />
              <Text
                style={[
                  styles.referralTitle,
                  { color: isDark ? "#34D399" : "#065F46" },
                ]}
              >
                Invited by{" "}
                <Text style={{ fontWeight: "700" }}>
                  {referrerName || referralCode}
                </Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setReferralCode("");
                setReferrerName("");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={14} color="#059669" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Central Auth Card with Smooth Animated Entrance */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Interactive Google Button with Spring Scale */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                isDark
                  ? { backgroundColor: "#1E293B", borderColor: "#334155" }
                  : { backgroundColor: "#FFFFFF", borderColor: "#CBD5E1" },
              ]}
              onPressIn={() => {
                Animated.spring(scaleAnim, {
                  toValue: 0.97,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(scaleAnim, {
                  toValue: 1,
                  tension: 70,
                  friction: 6,
                  useNativeDriver: true,
                }).start();
              }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleGoogleLogin();
              }}
              disabled={isGoogleLoading}
              activeOpacity={0.9}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color="#4285F4" size="small" />
              ) : (
                <>
                  <AntDesign
                    name="google"
                    color="#4285F4"
                    size={20}
                    style={{ marginRight: 10 }}
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
          </Animated.View>

          {/* Manual Referral Input */}
          {!referralCode && (
            <View style={{ marginTop: 14, alignItems: "center" }}>
              {!showManualReferral ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowManualReferral(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.referralLinkText,
                      { color: colors.primary },
                    ]}
                  >
                    Have a referral code?
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.manualReferralRow}>
                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      },
                    ]}
                    placeholder="Enter code"
                    placeholderTextColor={colors.textSecondary}
                    value={manualCode}
                    onChangeText={(t) => setManualCode(t.toUpperCase())}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[
                      styles.manualApplyBtn,
                      { backgroundColor: colors.primary },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleApplyManualCode();
                    }}
                  >
                    <Text style={styles.manualApplyBtnText}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowManualReferral(false)}
                    style={{ padding: 6 }}
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      {/* Mandatory Mobile Number Modal */}
      <Modal
        visible={showMobileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMobileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Mobile number
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Required for delivery updates
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMobileModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {referralCode ? (
              <View
                style={[
                  styles.modalReferralNotice,
                  {
                    backgroundColor: isDark
                      ? "rgba(5, 150, 105, 0.15)"
                      : "#ECFDF5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalReferralNoticeText,
                    { color: isDark ? "#34D399" : "#065F46" },
                  ]}
                >
                  Invited by {referrerName || referralCode}
                </Text>
              </View>
            ) : null}

            {mobileError ? (
              <Text style={styles.modalErrorText}>{mobileError}</Text>
            ) : null}

            <View style={styles.phoneInputContainer}>
              <View
                style={[
                  styles.countryCodeBox,
                  {
                    backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.countryCodeText, { color: colors.text }]}>
                  +91
                </Text>
              </View>
              <TextInput
                style={[
                  styles.phoneInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                  },
                ]}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                value={mobileNumber}
                onChangeText={(t) => setMobileNumber(t.replace(/\D/g, ""))}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: colors.border },
                ]}
                onPress={() => setShowMobileModal(false)}
              >
                <Text
                  style={[
                    styles.modalCancelBtnText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: colors.primary },
                  (isSubmittingPhone || mobileNumber.length !== 10) && {
                    opacity: 0.5,
                  },
                ]}
                disabled={isSubmittingPhone || mobileNumber.length !== 10}
                onPress={handleMobileSubmit}
              >
                {isSubmittingPhone ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  logoImage: {
    width: 38,
    height: 38,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  brandSlate: {
    color: "#0F172A",
  },
  brandRed: {
    color: "#DC2626",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 16,
  },
  redirectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  redirectBannerText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  referralTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  referralSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  referralLinkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  manualReferralRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  manualInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    minWidth: 120,
    fontWeight: "700",
  },
  manualApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  manualApplyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  cardHeaderSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 16,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  perksContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(148, 163, 184, 0.2)",
    gap: 8,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  perkText: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  footer: {
    marginTop: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },
  modalReferralNotice: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalReferralNoticeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalErrorText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 10,
  },
  phoneInputContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  countryCodeBox: {
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
