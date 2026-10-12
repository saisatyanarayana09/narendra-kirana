import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BouncyTouchable } from "../components/BouncyTouchable";
import { useTheme, getContrastTextColor } from "../context/ThemeContext";
import type { AuthStackParamList } from "../navigation/AuthStack";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, "Welcome">;
};

interface FeatureItem {
  id: string;
  icon: "zap" | "shield" | "tag";
  badge: string;
  title: string;
  description: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: "delivery",
    icon: "zap",
    badge: "Under 30 Mins",
    title: "Express Local Delivery",
    description:
      "Handpicked at your neighborhood kirana and brought straight to your doorstep.",
  },
  {
    id: "freshness",
    icon: "shield",
    badge: "100% Authentic",
    title: "Handpicked Daily Staples",
    description:
      "Farm-fresh produce, wholesome grains, aromatic spices, and trusted essentials.",
  },
  {
    id: "savings",
    icon: "tag",
    badge: "Direct Kirana Rates",
    title: "Honest Neighborhood Savings",
    description:
      "Wholesale kirana prices with instant basket discounts and zero hidden fees.",
  },
];

export function WelcomeScreen({ navigation }: Props) {
  const { colors, isDark } = useTheme();

  // Entrance animation values
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0)).current;
  const brandAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const buttonsAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for the open status dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Feature carousel state & animation
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const cardFade = useRef(new Animated.Value(1)).current;
  const cardSlide = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Entrance sequence
  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(badgeAnim, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 65,
        friction: 8,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 60,
        friction: 8,
      }),
      Animated.spring(brandAnim, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 60,
        friction: 8,
      }),
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 55,
        friction: 8,
      }),
      Animated.spring(buttonsAnim, {
        toValue: 1,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 55,
        friction: 8,
      }),
    ]).start();

    // Subtle pulsing dot animation for status pill
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.35,
          duration: 900,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [badgeAnim, logoAnim, brandAnim, cardAnim, buttonsAnim, pulseAnim]);

  // Carousel transition animation
  const animateCardSwitch = useCallback(() => {
    cardFade.setValue(0);
    cardSlide.setValue(8);
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 220,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 70,
        friction: 8,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
    ]).start();
  }, [cardFade, cardSlide]);

  const startAutoRotate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveFeatureIndex((prev) => {
        const next = (prev + 1) % FEATURES.length;
        animateCardSwitch();
        return next;
      });
    }, 4500);
  }, [animateCardSwitch]);

  useEffect(() => {
    startAutoRotate();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoRotate]);

  const handleSelectFeature = (index: number) => {
    if (index === activeFeatureIndex) return;
    setActiveFeatureIndex(index);
    animateCardSwitch();
    startAutoRotate(); // Reset timer so it doesn't immediately advance
  };

  const currentFeature = FEATURES[activeFeatureIndex];
  const gradientColors = colors.welcomeGradient;
  const primaryTextColor = getContrastTextColor(colors.primary);

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Top section: Store Status, Logo & Branding */}
          <View style={styles.headerSection}>
            {/* Live Store Status Badge */}
            <Animated.View
              style={[
                styles.statusBadge,
                {
                  opacity: badgeAnim,
                  backgroundColor: isDark
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(16, 185, 129, 0.08)",
                  borderColor: isDark
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(16, 185, 129, 0.2)",
                  transform: [
                    {
                      translateY: badgeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[styles.statusDot, { opacity: pulseAnim }]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isDark ? "#34d399" : "#059669" },
                ]}
              >
                OPEN TODAY • INSTANT DELIVERY
              </Text>
            </Animated.View>

            {/* Logo in Elevated Aura Frame */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoAnim,
                  transform: [
                    {
                      scale: logoAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.9, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.glowAura,
                  {
                    backgroundColor: isDark
                      ? `${colors.primary}22`
                      : `${colors.primary}15`,
                  },
                ]}
              />
              <View
                style={[
                  styles.logoFrame,
                  {
                    backgroundColor: isDark ? colors.surface : "#FFFFFF",
                    borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)",
                  },
                ]}
              >
                <Image
                  source={require("../../assets/logo-transparent.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>

            {/* Store Name & Clean Tagline */}
            <Animated.View
              style={[
                styles.brandContainer,
                {
                  opacity: brandAnim,
                  transform: [
                    {
                      translateY: brandAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.brandTitle}>
                <Text
                  style={{
                    color: isDark
                      ? colors.primaryLight
                      : colors.primaryDark || colors.primary,
                  }}
                >
                  NARENDRA{" "}
                </Text>
                <Text style={{ color: colors.primary }}>KIRANA</Text>
              </Text>
              <Text
                style={[styles.brandSubtitle, { color: colors.textSecondary }]}
              >
                Your trusted neighborhood store,{"\n"}delivered to your doorstep
                in minutes.
              </Text>
            </Animated.View>
          </View>

          {/* Middle section: Interactive Feature Benefit Card */}
          <Animated.View
            style={[
              styles.cardSection,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Feature Card with Spring Transition */}
            <Animated.View
              style={[
                styles.featureCard,
                {
                  backgroundColor: isDark ? colors.surface : "#FFFFFF",
                  borderColor: isDark ? colors.border : "rgba(0,0,0,0.06)",
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }],
                },
              ]}
            >
              <View style={styles.featureCardHeader}>
                <View
                  style={[
                    styles.featureIconBox,
                    {
                      backgroundColor: isDark
                        ? `${colors.primary}25`
                        : colors.primaryLight,
                    },
                  ]}
                >
                  <Feather
                    name={currentFeature.icon}
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View
                  style={[
                    styles.featureBadge,
                    {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : colors.mutedSurface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.featureBadgeText, { color: colors.primary }]}
                  >
                    {currentFeature.badge}
                  </Text>
                </View>
              </View>

              <Text
                style={[styles.featureTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {currentFeature.title}
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  { color: colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {currentFeature.description}
              </Text>
            </Animated.View>

            {/* Pagination Indicator Dots */}
            <View style={styles.paginationRow}>
              {FEATURES.map((feat, idx) => {
                const isActive = idx === activeFeatureIndex;
                return (
                  <TouchableOpacity
                    key={feat.id}
                    onPress={() => handleSelectFeature(idx)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={[
                      styles.paginationDot,
                      {
                        width: isActive ? 22 : 6,
                        backgroundColor: isActive
                          ? colors.primary
                          : isDark
                            ? "#3f444a"
                            : "#cbd5e1",
                      },
                    ]}
                  />
                );
              })}
            </View>

            {/* Trust Assurance Ribbon */}
            <View style={styles.trustRibbon}>
              <View style={styles.trustItem}>
                <Feather name="check" size={12} color={colors.primary} />
                <Text
                  style={[styles.trustText, { color: colors.textSecondary }]}
                >
                  No Minimum Order
                </Text>
              </View>
              <Text style={[styles.trustDivider, { color: colors.border }]}>
                •
              </Text>
              <View style={styles.trustItem}>
                <Feather name="shield" size={12} color={colors.primary} />
                <Text
                  style={[styles.trustText, { color: colors.textSecondary }]}
                >
                  Verified Quality
                </Text>
              </View>
              <Text style={[styles.trustDivider, { color: colors.border }]}>
                •
              </Text>
              <View style={styles.trustItem}>
                <Feather name="credit-card" size={12} color={colors.primary} />
                <Text
                  style={[styles.trustText, { color: colors.textSecondary }]}
                >
                  Easy UPI & Cash
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Bottom section: CTAs */}
          <Animated.View
            style={[
              styles.footerSection,
              {
                opacity: buttonsAnim,
                transform: [
                  {
                    translateY: buttonsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Primary Action: Get Started */}
            <BouncyTouchable
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
              ]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text
                style={[styles.primaryButtonText, { color: primaryTextColor }]}
              >
                Get Started
              </Text>
              <Feather
                name="arrow-right"
                size={18}
                color={primaryTextColor}
                style={styles.buttonIcon}
              />
            </BouncyTouchable>

            {/* Secondary Action: Explore as Guest */}
            <BouncyTouchable
              style={[
                styles.guestButton,
                {
                  backgroundColor: isDark
                    ? colors.surface
                    : "rgba(255, 255, 255, 0.8)",
                  borderColor: isDark ? colors.border : "rgba(0, 0, 0, 0.08)",
                },
              ]}
              onPress={() => (navigation as any).navigate("Main")}
            >
              <Feather
                name="compass"
                size={16}
                color={colors.textSecondary}
                style={styles.guestIcon}
              />
              <Text
                style={[
                  styles.guestButtonText,
                  { color: isDark ? colors.text : "#334155" },
                ]}
              >
                Explore Store as Guest
              </Text>
            </BouncyTouchable>

            {/* Existing User Login Prompt */}
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.loginPromptText,
                  { color: colors.textSecondary },
                ]}
              >
                Already have an account?{" "}
                <Text
                  style={[styles.loginHighlight, { color: colors.primary }]}
                >
                  Sign in
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerSection: {
    alignItems: "center",
    paddingTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    gap: 7,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10b981",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  glowAura: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  logoFrame: {
    width: 104,
    height: 104,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logoImage: {
    width: 76,
    height: 76,
  },
  brandContainer: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  brandTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 290,
  },
  cardSection: {
    width: "100%",
    alignItems: "center",
    marginVertical: 16,
  },
  featureCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  featureCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  featureIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  featureBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  featureBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  trustRibbon: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 4,
    flexWrap: "wrap",
    gap: 8,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 11,
    fontWeight: "600",
  },
  trustDivider: {
    fontSize: 11,
  },
  footerSection: {
    width: "100%",
    paddingTop: 8,
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  guestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
  },
  guestIcon: {
    marginRight: 8,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  loginLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  loginPromptText: {
    fontSize: 13,
    fontWeight: "500",
  },
  loginHighlight: {
    fontWeight: "800",
  },
});
