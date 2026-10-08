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
  Platform,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";

import { apiClient } from "../../api/client";
import { AnimatedAuthBackground } from "../../components/auth/AnimatedAuthBackground";
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
  const [, setIsLookingUpReferral] = useState(false);

  // Staggered fluid entrance physics
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const buttonSlide = useRef(new Animated.Value(16)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(70, [
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 65,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.spring(buttonSlide, {
        toValue: 0,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Manual invite code drawer
  const [showInviteInput, setShowInviteInput] = useState(false);
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

    Clipboard.getStringAsync()
      .then((clip) => {
        const trimmed = (clip || "").trim();
        if (/^[A-Za-z0-9]{5,12}$/.test(trimmed)) {
          const code = trimmed.toUpperCase();
          setReferralCode(code);
          lookupReferrer(code);
          return;
        }
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

  const handleApplyInviteCode = () => {
    const clean = manualCode.trim().toUpperCase();
    if (!clean) return;
    setReferralCode(clean);
    lookupReferrer(clean);
    setShowInviteInput(false);
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
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      {/* Ambient Hairline SVG Background with Floating Wireframes */}
      <AnimatedAuthBackground isDark={isDark} />

      {/* Top Bar with Apple-Style Frosted Circular Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.backCircleBtn,
            {
              backgroundColor: isDark
                ? "rgba(30, 41, 59, 0.75)"
                : "rgba(255, 255, 255, 0.85)",
              borderColor: isDark
                ? "rgba(51, 65, 85, 0.6)"
                : "rgba(226, 232, 240, 0.9)",
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.canGoBack()
              ? navigation.goBack()
              : (navigation as any).navigate("Main");
          }}
          activeOpacity={0.75}
        >
          <Feather
            name="arrow-left"
            color={isDark ? "#F8FAFC" : "#0F172A"}
            size={16}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid
      >
        {/* Centerpiece: Squircle Brand Mark + Typographic Identity */}
        <View style={styles.centerSection}>
          <Animated.View
            style={[
              styles.logoWrapper,
              {
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.06)",
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require("../../../assets/narendra-logo-tight.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View
            style={[styles.brandTextContainer, { opacity: contentFade }]}
          >
            <Text style={styles.brandTitle}>
              <Text style={[styles.brandSlate, { color: colors.text }]}>
                Narendra{" "}
              </Text>
              <Text style={styles.brandRed}>Kirana</Text>
            </Text>

            {/* Contextual Subline (Only if redirected from checkout) */}
            {pendingRedirect ? (
              <Text style={styles.contextualSubline}>Complete checkout</Text>
            ) : null}

            {/* Frosted Micro-Pill for Referral (No clunky green boxes) */}
            {referralCode ? (
              <View
                style={[
                  styles.invitePill,
                  {
                    backgroundColor: isDark
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(16, 185, 129, 0.08)",
                    borderColor: isDark
                      ? "rgba(16, 185, 129, 0.25)"
                      : "rgba(16, 185, 129, 0.2)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.invitePillText,
                    { color: isDark ? "#34D399" : "#059669" },
                  ]}
                >
                  Invited by {referrerName || referralCode}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setReferralCode("");
                    setReferrerName("");
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name="x"
                    size={11}
                    color={isDark ? "#34D399" : "#059669"}
                  />
                </TouchableOpacity>
              </View>
            ) : null}
          </Animated.View>
        </View>

        {/* Action Area: Precision Tactile Google Button */}
        <Animated.View
          style={[
            styles.actionArea,
            {
              opacity: contentFade,
              transform: [{ translateY: buttonSlide }],
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.googleButton,
                isDark
                  ? {
                      backgroundColor: "#1E293B",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                    }
                  : {
                      backgroundColor: "#FFFFFF",
                      borderColor: "#E2E8F0",
                      ...styles.lightElevation,
                    },
              ]}
              onPressIn={() => {
                Animated.spring(buttonScale, {
                  toValue: 0.97,
                  tension: 90,
                  friction: 6,
                  useNativeDriver: true,
                }).start();
              }}
              onPressOut={() => {
                Animated.spring(buttonScale, {
                  toValue: 1,
                  tension: 75,
                  friction: 7,
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
                    size={18}
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[
                      styles.googleButtonText,
                      { color: isDark ? "#F8FAFC" : "#0F172A" },
                    ]}
                  >
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Inline Invite Code Drawer */}
          {!referralCode && (
            <View style={styles.inviteCodeContainer}>
              {!showInviteInput ? (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowInviteInput(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.inviteCodeLink}>Invite code</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.inlineCodeInputRow}>
                  <TextInput
                    style={[
                      styles.inlineInput,
                      {
                        color: colors.text,
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.12)"
                          : "#E2E8F0",
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      },
                    ]}
                    placeholder="CODE"
                    placeholderTextColor={colors.textSecondary}
                    value={manualCode}
                    onChangeText={(t) => setManualCode(t.toUpperCase())}
                    autoCapitalize="characters"
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[
                      styles.inlineApplyBtn,
                      { backgroundColor: isDark ? "#334155" : "#0F172A" },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      handleApplyInviteCode();
                    }}
                  >
                    <Text style={styles.inlineApplyText}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowInviteInput(false)}
                    style={{ padding: 6 }}
                  >
                    <Feather name="x" size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Minimal Footer */}
        <Animated.View style={[styles.footer, { opacity: contentFade }]}>
          <Text style={styles.footerText}>Terms • Privacy</Text>
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* High-End Mobile Verification Modal */}
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
              {
                backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.08)",
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Phone number
                </Text>
                <Text style={styles.modalSubtitle}>Required for delivery</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowMobileModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {referralCode ? (
              <View
                style={[
                  styles.modalInviteBadge,
                  {
                    backgroundColor: isDark
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(16, 185, 129, 0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalInviteText,
                    { color: isDark ? "#34D399" : "#059669" },
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
                    backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "#E2E8F0",
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
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "#E2E8F0",
                    backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                  },
                ]}
                placeholder="10-digit number"
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
                  {
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.1)"
                      : "#E2E8F0",
                  },
                ]}
                onPress={() => setShowMobileModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: isDark ? "#38BDF8" : "#0F172A" },
                  (isSubmittingPhone || mobileNumber.length !== 10) && {
                    opacity: 0.45,
                  },
                ]}
                disabled={isSubmittingPhone || mobileNumber.length !== 10}
                onPress={handleMobileSubmit}
              >
                {isSubmittingPhone ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text
                    style={[
                      styles.modalSubmitBtnText,
                      { color: isDark ? "#0F172A" : "#FFFFFF" },
                    ]}
                  >
                    Continue
                  </Text>
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
  safeArea: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  centerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  brandTextContainer: {
    alignItems: "center",
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  brandSlate: {
    color: "#0F172A",
  },
  brandRed: {
    color: "#DC2626",
  },
  contextualSubline: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 4,
    letterSpacing: -0.2,
  },
  invitePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  invitePillText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  actionArea: {
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  lightElevation: {
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  googleButtonText: {
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  inviteCodeContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  inviteCodeLink: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: -0.1,
  },
  inlineCodeInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11.5,
    fontWeight: "700",
    minWidth: 100,
    letterSpacing: 0.5,
  },
  inlineApplyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineApplyText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: "#94A3B8",
    marginTop: 2,
  },
  modalInviteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  modalInviteText: {
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
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
