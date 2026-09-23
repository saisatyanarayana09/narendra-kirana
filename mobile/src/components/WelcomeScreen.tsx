import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  getHasShownWelcomeSession,
  setHasShownWelcomeSession,
  resetWelcomeSession,
} from "../utils/welcomeSession";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

export { resetWelcomeSession };

interface WelcomeScreenProps {
  forceShow?: boolean;
  onStart?: () => void;
  onFinish?: () => void;
}

export function WelcomeScreen({
  forceShow = false,
  onStart,
  onFinish,
}: WelcomeScreenProps) {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mainFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.85)).current;
  const logoTranslateYAnim = useRef(new Animated.Value(24)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const nTranslateY = useRef(new Animated.Value(-80)).current;
  const vTranslateY = useRef(new Animated.Value(80)).current;

  const brandFadeAnim = useRef(new Animated.Value(0)).current;
  const brandLeftTranslateX = useRef(new Animated.Value(-50)).current;
  const brandRightTranslateX = useRef(new Animated.Value(50)).current;
  const greetingFadeAnim = useRef(new Animated.Value(0)).current;

  // Continuous animations
  const hintOpacityAnim = useRef(new Animated.Value(0.3)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;

    if (forceShow || !getHasShownWelcomeSession()) {
      setHasShownWelcomeSession(true);
      setVisible(true);
      if (onStart) onStart();

      // Reset animation values for clean replay
      mainFadeAnim.setValue(0);
      logoScaleAnim.setValue(0.85);
      logoTranslateYAnim.setValue(24);
      logoFadeAnim.setValue(0);
      nTranslateY.setValue(-80);
      vTranslateY.setValue(80);
      brandFadeAnim.setValue(0);
      brandLeftTranslateX.setValue(-50);
      brandRightTranslateX.setValue(50);
      greetingFadeAnim.setValue(0);

      // Fade in background immediately
      Animated.timing(mainFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();

      // Staggered entrance
      Animated.stagger(150, [
        Animated.parallel([
          Animated.spring(logoScaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(logoTranslateYAnim, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(logoFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(nTranslateY, {
            toValue: 0,
            tension: 40,
            friction: 5,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(vTranslateY, {
            toValue: 0,
            tension: 40,
            friction: 5,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ]),
        Animated.parallel([
          Animated.timing(brandFadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(brandLeftTranslateX, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.spring(brandRightTranslateX, {
            toValue: 0,
            tension: 50,
            friction: 7,
            useNativeDriver: USE_NATIVE_DRIVER,
          })
        ]),
        Animated.timing(greetingFadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start(() => {
        // Start continuous 3D spin loop for logo
        Animated.loop(
          Animated.timing(spinAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: USE_NATIVE_DRIVER,
          })
        ).start();

        // Start pulsing animation for hint text
        Animated.loop(
          Animated.sequence([
            Animated.timing(hintOpacityAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(hintOpacityAnim, {
              toValue: 0.3,
              duration: 800,
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ])
        ).start();
      });

      timerRef.current = setTimeout(() => {
        dismiss();
      }, 3500);
    }
  }, [isLoading, forceShow]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = () => {
    Animated.timing(mainFadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  };

  if (!visible) return null;

  const hour = new Date().getHours();
  let greeting = "Welcome";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    greeting = "Good evening";
  }

  const name = user?.first_name || user?.username || "Guest";

  const spinY = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="none"
      onRequestClose={dismiss}
    >
      <Animated.View style={[styles.overlay, { opacity: mainFadeAnim }]}>
        <LinearGradient
          colors={
            isDark
              ? ["#090D16", "#0C1220", "#064E3B"]
              : ["#FFFFFF", "#F0FDF4", "#ECFDF5"]
          }
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Decoration */}
        <View
          style={[
            styles.circle1,
            isDark && { borderColor: "rgba(52, 211, 153, 0.1)" },
          ]}
        />
        <View
          style={[
            styles.circle2,
            isDark && { borderColor: "rgba(52, 211, 153, 0.12)" },
          ]}
        />
        <View
          style={[
            styles.circle3,
            isDark && { backgroundColor: "rgba(52, 211, 153, 0.06)" },
          ]}
        />

        <TouchableOpacity
          style={styles.touchContainer}
          activeOpacity={1}
          onPress={dismiss}
        >
          <View style={styles.contentContainer}>
            <Animated.View
              style={{
                opacity: logoFadeAnim,
                transform: [
                  { scale: logoScaleAnim },
                  { translateY: logoTranslateYAnim },
                ],
                alignItems: "center",
              }}
            >
              <Animated.View style={[styles.logoWrapper, { transform: [{ rotateY: spinY }] }]}>
                <View style={styles.nvContainer}>
                  <Animated.Text style={[styles.logoLetterN, isDark && { color: "#F8FAFC" }, { transform: [{ translateY: nTranslateY }] }]}>
                    N
                  </Animated.Text>
                  <Animated.Text style={[styles.logoLetterV, { transform: [{ translateY: vTranslateY }] }]}>
                    V
                  </Animated.Text>
                </View>
              </Animated.View>
            </Animated.View>

            <Animated.View
              style={[styles.brandRow, { opacity: brandFadeAnim }]}
            >
              <Animated.Text
                style={[
                  styles.brandEmerald, 
                  isDark && { color: "#34D399" }, 
                  { transform: [{ translateX: brandLeftTranslateX }] }
                ]}
              >
                NARENDRA{" "}
              </Animated.Text>
              <Animated.Text
                style={[
                  styles.brandPrimary,
                  isDark && { color: colors.primary },
                  { transform: [{ translateX: brandRightTranslateX }] }
                ]}
              >
                KIRANA
              </Animated.Text>
            </Animated.View>

            <Animated.View style={{ opacity: greetingFadeAnim }}>
              <Text
                style={[
                  styles.greetingHeadline,
                  isDark && { color: "#F8FAFC" },
                ]}
              >
                {greeting},{"\n"}
                {name}.
              </Text>
            </Animated.View>
          </View>

          <Animated.Text
            style={[
              styles.dismissHint,
              isDark && { color: "rgba(148, 163, 184, 0.6)" },
              { opacity: hintOpacityAnim }
            ]}
          >
            Tap anywhere to continue
          </Animated.Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  circle1: {
    position: "absolute",
    alignSelf: "center",
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.06)",
  },
  circle2: {
    position: "absolute",
    alignSelf: "center",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.08)",
  },
  circle3: {
    position: "absolute",
    alignSelf: "center",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(16, 185, 129, 0.04)",
  },
  touchContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 130,
    height: 130,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  nvContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  logoLetterN: {
    fontSize: 85,
    fontWeight: "900",
    color: "#064E3B",
    fontStyle: "italic",
    marginRight: -12, // Slight overlap
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  logoLetterV: {
    fontSize: 70,
    fontWeight: "900",
    color: "#34D399",
    fontStyle: "italic",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  brandEmerald: {
    fontSize: 15,
    fontWeight: "900",
    color: "#064E3B",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  brandPrimary: {
    fontSize: 15,
    fontWeight: "900",
    color: "#16A34A",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  greetingHeadline: {
    fontSize: 36,
    fontWeight: "900",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 44,
    paddingHorizontal: 16,
  },
  dismissHint: {
    position: "absolute",
    bottom: 60,
    fontSize: 12,
    color: "rgba(100, 116, 139, 0.4)",
    fontWeight: "500",
  },
});
