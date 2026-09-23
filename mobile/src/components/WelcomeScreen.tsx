import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Modal,
  Platform,
  StatusBar,
  Easing,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  getHasShownWelcomeSession,
  setHasShownWelcomeSession,
  resetWelcomeSession,
} from "../utils/welcomeSession";

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const { width, height } = Dimensions.get("window");
const GRADIENT_SIZE = Math.max(width, height) * 2;

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
  const { isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const shouldShow = forceShow || !getHasShownWelcomeSession();
  const [visible, setVisible] = useState(shouldShow);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mainFadeAnim = useRef(new Animated.Value(shouldShow ? 1 : 0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.95)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const gradientRotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;

    if (visible) {
      setHasShownWelcomeSession(true);
      if (onStart) onStart();

      // Reset
      mainFadeAnim.setValue(1);
      logoScaleAnim.setValue(0.95);
      logoFadeAnim.setValue(0);
      textFadeAnim.setValue(0);
      gradientRotateAnim.setValue(0);

      // Start continuous gradient swirl
      Animated.loop(
        Animated.timing(gradientRotateAnim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.linear,
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      ).start();

      Animated.parallel([
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 1000,
          delay: 400,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        dismiss();
      }, 3500); // slightly longer so they can enjoy the moving gradient
    } else if (forceShow) {
      setVisible(true);
    }
  }, [isLoading, forceShow, visible]);

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

  const spin = gradientRotateAnim.interpolate({
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
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <Animated.View style={[styles.overlay, { opacity: mainFadeAnim }]}>
        
        {/* Moving Background Gradient */}
        <Animated.View
          style={[
            styles.movingGradientContainer,
            { transform: [{ rotate: spin }] }
          ]}
        >
          <LinearGradient
            colors={
              isDark
                ? ["#022C22", "#064E3B", "#0F766E", "#064E3B", "#022C22"]
                : ["#F0FDF4", "#D1FAE5", "#A7F3D0", "#D1FAE5", "#F0FDF4"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Frost / Glass effect overlay to make the moving gradient feel soft and premium */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)' }]} />

        {/* Foreground Content */}
        <View style={styles.contentContainer}>
          <Animated.View
            style={{
              opacity: logoFadeAnim,
              transform: [{ scale: logoScaleAnim }],
              alignItems: "center",
            }}
          >
            <View style={styles.logoWrapper}>
              <Image
                source={require("../../assets/logo-transparent.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          <Animated.View style={[styles.brandRow, { opacity: textFadeAnim }]}>
            <Text
              style={[
                styles.brandText,
                { color: isDark ? "#FFFFFF" : "#022C22" }
              ]}
            >
              NARENDRA KIRANA
            </Text>
          </Animated.View>
        </View>

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
    backgroundColor: "#000",
    overflow: "hidden",
  },
  movingGradientContainer: {
    position: "absolute",
    width: GRADIENT_SIZE,
    height: GRADIENT_SIZE,
    top: -(GRADIENT_SIZE - height) / 2,
    left: -(GRADIENT_SIZE - width) / 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  logoWrapper: {
    width: 150,
    height: 150,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  brandRow: {
    alignItems: "center",
  },
  brandText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 5,
    textTransform: "uppercase",
  },
});
