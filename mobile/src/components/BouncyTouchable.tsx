import React, { useRef } from "react";
import {
  Pressable,
  Animated,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
  Platform,
  PressableProps,
} from "react-native";

import { triggerHaptic } from "../utils/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface BouncyTouchableProps extends Omit<PressableProps, "style"> {
  children?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  tension?: number;
  friction?: number;
  hapticType?:
    | "light"
    | "medium"
    | "selection"
    | "heavy"
    | "success"
    | "warning"
    | "error"
    | false;
  disabled?: boolean;
}

export const BouncyTouchable: React.FC<BouncyTouchableProps> = ({
  children,
  onPress,
  style,
  scaleTo = 0.96,
  tension = 150,
  friction = 7,
  hapticType = "light",
  disabled = false,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    if (disabled) return;
    Animated.spring(scale, {
      toValue: scaleTo,
      tension,
      friction,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      tension,
      friction,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    onPressOut?.(e);
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    if (hapticType) {
      triggerHaptic(hapticType);
    }
    onPress?.(e);
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default BouncyTouchable;
