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
  const { isLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const shouldShow = forceShow || !getHasShownWelcomeSession();
  const [visible, setVisible] = useState(shouldShow);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize mainFadeAnim to 1 so it blocks the screen INSTANTLY without fading in
  const mainFadeAnim = useRef(new Animated.Value(shouldShow ? 1 : 0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.95)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;

    if (visible) {
      setHasShownWelcomeSession(true);
      if (onStart) onStart();

      // Ensure main opacity is 1 in case of forceShow re-triggers
      mainFadeAnim.setValue(1);
      logoScaleAnim.setValue(0.95);
      logoFadeAnim.setValue(0);
      textFadeAnim.setValue(0);

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
          delay: 300,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]).start();

      // Shorter timer for professional feel
      timerRef.current = setTimeout(() => {
        dismiss();
      }, 2800);
    } else if (forceShow) {
      // If forceShow triggers later when visible was false
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
      duration: 400,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => {
      setVisible(false);
      if (onFinish) onFinish();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="none"
      onRequestClose={dismiss}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      <Animated.View 
        style={[
          styles.overlay, 
          { 
            opacity: mainFadeAnim,
            backgroundColor: isDark ? "#000000" : "#FFFFFF" 
          }
        ]}
      >
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
              { color: isDark ? "#FFFFFF" : "#000000" }
            ]}
          >
            NARENDRA KIRANA
          </Text>
        </Animated.View>
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
  logoWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  brandRow: {
    alignItems: "center",
  },
  brandText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
});
