import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

interface Props {
  isDark: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Precision hairline SVG paths (strokeWidth: 1.2, strokeLinecap: round, strokeLinejoin: round)
// 1. Shopping Bag
function ShoppingBagIcon({ color }: { color: string }) {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8V6.5C6 4.567 7.567 3 9.5 3h5C16.433 3 18 4.567 18 6.5V8"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <Path
        d="M4.5 8.5h15l-1.2 11.2c-.1.9-.9 1.6-1.8 1.6H7.5c-.9 0-1.7-.7-1.8-1.6L4.5 8.5z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path
        d="M10 12a2 2 0 104 0"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// 2. Store Cart / Trolley
function StoreCartIcon({ color }: { color: string }) {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 4h2.5l2 10.5h10l2-8H6.5"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM16.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
        stroke={color}
        strokeWidth={1.2}
      />
    </Svg>
  );
}

// 3. Kirana Awning / Storefront
function StorefrontIcon({ color }: { color: string }) {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l1.5-5h15L21 9M3 9v10a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5V9M3 9h18"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 14h6v6.5H9V14z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 4. Delivery Parcel Box
function ParcelBoxIcon({ color }: { color: string }) {
  return (
    <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l9 4.8v8.4L12 21l-9-4.8V7.8L12 3z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path
        d="M12 3v9M21 7.8l-9 4.2M3 7.8l9 4.2"
        stroke={color}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 5. Ambient Starlight Sparkle
function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"
        stroke={color}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}

interface FloatingNodeConfig {
  component: React.ComponentType<{ color: string }>;
  initialX: number;
  initialY: number;
  deltaX: number;
  deltaY: number;
  duration: number;
  rotateDeg: string;
}

const NODES_CONFIG: FloatingNodeConfig[] = [
  {
    component: ShoppingBagIcon,
    initialX: 30,
    initialY: 90,
    deltaX: 6,
    deltaY: -16,
    duration: 5200,
    rotateDeg: "-4deg",
  },
  {
    component: StoreCartIcon,
    initialX: SCREEN_WIDTH - 70,
    initialY: 130,
    deltaX: -8,
    deltaY: 18,
    duration: 4800,
    rotateDeg: "5deg",
  },
  {
    component: StorefrontIcon,
    initialX: 25,
    initialY: SCREEN_HEIGHT - 220,
    deltaX: 7,
    deltaY: -14,
    duration: 5800,
    rotateDeg: "-3deg",
  },
  {
    component: ParcelBoxIcon,
    initialX: SCREEN_WIDTH - 75,
    initialY: SCREEN_HEIGHT - 260,
    deltaX: -6,
    deltaY: 15,
    duration: 4600,
    rotateDeg: "4deg",
  },
  {
    component: SparkleIcon,
    initialX: 55,
    initialY: SCREEN_HEIGHT / 2 - 40,
    deltaX: 5,
    deltaY: -10,
    duration: 4200,
    rotateDeg: "8deg",
  },
  {
    component: SparkleIcon,
    initialX: SCREEN_WIDTH - 55,
    initialY: SCREEN_HEIGHT / 2 + 60,
    deltaX: -5,
    deltaY: 12,
    duration: 5000,
    rotateDeg: "-6deg",
  },
];

export function AnimatedAuthBackground({ isDark }: Props) {
  const iconColor = isDark ? "#60A5FA" : "#059669";
  const auraColor = isDark
    ? "rgba(16, 185, 129, 0.08)"
    : "rgba(16, 185, 129, 0.05)";

  // Ambient pulsing aura
  const auraScale = useRef(new Animated.Value(1)).current;
  const auraOpacity = useRef(new Animated.Value(isDark ? 0.08 : 0.05)).current;

  // Animation values for each floating node
  const animValues = useRef(
    NODES_CONFIG.map(() => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      opacity: new Animated.Value(isDark ? 0.12 : 0.08),
    }))
  ).current;

  useEffect(() => {
    // Breathing aura animation
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(auraScale, {
            toValue: 1.15,
            duration: 4500,
            useNativeDriver: true,
          }),
          Animated.timing(auraOpacity, {
            toValue: isDark ? 0.14 : 0.09,
            duration: 4500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(auraScale, {
            toValue: 1,
            duration: 4500,
            useNativeDriver: true,
          }),
          Animated.timing(auraOpacity, {
            toValue: isDark ? 0.08 : 0.05,
            duration: 4500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // Floating drift animations for each node
    const loops = animValues.map((anim, index) => {
      const cfg = NODES_CONFIG[index];
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(anim.y, {
              toValue: cfg.deltaY,
              duration: cfg.duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim.x, {
              toValue: cfg.deltaX,
              duration: cfg.duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: isDark ? 0.18 : 0.14,
              duration: cfg.duration,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anim.y, {
              toValue: 0,
              duration: cfg.duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim.x, {
              toValue: 0,
              duration: cfg.duration,
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: isDark ? 0.1 : 0.07,
              duration: cfg.duration,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    loops.forEach((loop) => loop.start());

    return () => {
      loops.forEach((loop) => loop.stop());
    };
  }, [isDark]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Central Ambient Breathing Aura */}
      <Animated.View
        style={[
          styles.ambientAura,
          {
            backgroundColor: auraColor,
            transform: [{ scale: auraScale }],
            opacity: auraOpacity,
          },
        ]}
      />

      {/* Floating Hairline Vector Wireframes */}
      {NODES_CONFIG.map((cfg, index) => {
        const IconComponent = cfg.component;
        const anim = animValues[index];

        return (
          <Animated.View
            key={`node-${index}`}
            style={[
              styles.floatingNode,
              {
                left: cfg.initialX,
                top: cfg.initialY,
                opacity: anim.opacity,
                transform: [
                  { translateX: anim.x },
                  { translateY: anim.y },
                  { rotate: cfg.rotateDeg },
                ],
              },
            ]}
          >
            <IconComponent color={iconColor} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  ambientAura: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.28,
    left: SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: (SCREEN_WIDTH * 0.7) / 2,
  },
  floatingNode: {
    position: "absolute",
  },
});
