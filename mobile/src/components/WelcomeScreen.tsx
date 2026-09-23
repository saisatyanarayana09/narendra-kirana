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
const { height } = Dimensions.get("window");

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
  const { isLoading, user } = useAuth();
  const { isDark, colors } = useTheme();
  const shouldShow = forceShow || !getHasShownWelcomeSession();
  const [visible, setVisible] = useState(shouldShow);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Instantly block screen
  const mainFadeAnim = useRef(new Animated.Value(shouldShow ? 1 : 0)).current;
  
  // Cinematic Animation values
  const bgOpacityAnim = useRef(new Animated.Value(0)).current; // Fades from Pitch Black to Deep Green
  const spotlightY = useRef(new Animated.Value(-height)).current;
  const logoFadeAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.9)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const greetingFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;

    if (visible) {
      setHasShownWelcomeSession(true);
      if (onStart) onStart();

      // Reset
      mainFadeAnim.setValue(1);
      bgOpacityAnim.setValue(0);
      spotlightY.setValue(-height);
      logoFadeAnim.setValue(0);
      logoScaleAnim.setValue(0.9);
      textFadeAnim.setValue(0);
      greetingFadeAnim.setValue(0);

      // The Spotlight Sweep!
      Animated.timing(spotlightY, {
        toValue: height * 1.5,
        duration: 2200,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();

      // Reveal sequence triggered exactly when spotlight hits the center
      Animated.parallel([
        Animated.timing(bgOpacityAnim, {
          toValue: 1,
          duration: 1500,
          delay: 500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(logoFadeAnim, {
          toValue: 1,
          duration: 1000,
          delay: 500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.spring(logoScaleAnim, {
          toValue: 1,
          tension: 10,
          friction: 8,
          delay: 500,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 1000,
          delay: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(greetingFadeAnim, {
          toValue: 1,
          duration: 1000,
          delay: 1100, // Slightly after brand text
          useNativeDriver: USE_NATIVE_DRIVER,
        })
      ]).start();

      timerRef.current = setTimeout(() => {
        dismiss();
      }, 3600); // Increased slightly so user can read greeting
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
      duration: 600,
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

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={visible}
      animationType="none"
      onRequestClose={dismiss}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Base Layer: Pitch Black */}
      <Animated.View style={[styles.overlay, { opacity: mainFadeAnim }]}>
        
        {/* Transition Layer: Brand Emerald */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, opacity: bgOpacityAnim }]} />

        {/* The Spotlight Light Beam */}
        <Animated.View
          style={[
            styles.spotlightWrapper,
            { transform: [{ translateY: spotlightY }, { rotate: '-25deg' }] }
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

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

          <Animated.View style={[styles.brandRow, { opacity: textFadeAnim, paddingHorizontal: 24 }]}>
            <Text 
              style={styles.brandText}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Narendra Kirana
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: greetingFadeAnim, marginTop: 12 }}>
            <Text style={styles.greetingText}>
              {greeting}, {name}
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
    backgroundColor: "#000000",
    overflow: "hidden",
  },
  spotlightWrapper: {
    position: "absolute",
    width: "200%",
    height: 300,
    top: 0,
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
    marginBottom: 20,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  brandRow: {
    alignItems: "center",
    width: "100%",
  },
  brandText: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 3,
    color: "#FFFFFF",
    textAlign: "center",
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
});
