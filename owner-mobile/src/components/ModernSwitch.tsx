import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  ViewStyle,
  Platform,
  View,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

export interface ModernSwitchProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
  activeTrackColor?: string;
  inactiveTrackColor?: string;
  activeThumbColor?: string;
  inactiveThumbColor?: string;
  trackColor?: { false?: string; true?: string };
  thumbColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Modern Edge-to-Edge Sliding Switch
 * Upgrade from inset floating switch (style 2) to full-height flush sliding switch (style 1).
 * Features 100% vertical thumb coverage, seamless border radius matching, and smooth translation.
 */
export default function ModernSwitch({
  value,
  onValueChange,
  disabled = false,
  width = 52,
  height = 28,
  activeTrackColor,
  inactiveTrackColor,
  activeThumbColor,
  inactiveThumbColor,
  trackColor,
  thumbColor,
  style,
  accessibilityLabel,
}: ModernSwitchProps) {
  const { isDark } = useAppTheme();

  // Animation progress: 0 = OFF (left), 1 = ON (right)
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, animValue]);

  // Color resolution (matching image 1 palette while respecting custom overrides)
  const resolvedActiveTrack =
    trackColor?.true || activeTrackColor || (isDark ? '#436854' : '#86b498');
  const resolvedInactiveTrack =
    trackColor?.false || inactiveTrackColor || (isDark ? '#334155' : '#cbd5e1');

  const resolvedActiveThumb =
    thumbColor || activeThumbColor || '#c6ff7e';
  const resolvedInactiveThumb =
    thumbColor || inactiveThumbColor || (isDark ? '#64748b' : '#94a3b8');

  const thumbWidth = width / 2;
  const slideDistance = width - thumbWidth;

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, slideDistance],
  });

  const trackBgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [resolvedInactiveTrack, resolvedActiveTrack],
  });

  const thumbBgColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [resolvedInactiveThumb, resolvedActiveThumb],
  });

  const handlePress = () => {
    if (disabled || !onValueChange) return;
    onValueChange(!value);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.pressable, { opacity: disabled ? 0.5 : 1 }, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width,
            height,
            borderRadius: height / 2,
            backgroundColor: trackBgColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              height: '100%',
              borderRadius: height / 2,
              backgroundColor: thumbBgColor,
              transform: [{ translateX }],
            },
            Platform.select({
              web: {
                boxShadow: value
                  ? '0 1px 3px rgba(0,0,0,0.18)'
                  : '0 1px 2px rgba(0,0,0,0.12)',
              } as any,
              default: {
                elevation: 2,
              },
            }),
          ]}
        >
          {/* Subtle vertical hairline edge matching modern switch design */}
          <View
            style={[
              styles.thumbHairline,
              {
                backgroundColor: value
                  ? 'rgba(255, 255, 255, 0.4)'
                  : 'rgba(255, 255, 255, 0.2)',
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  thumbHairline: {
    width: 1,
    height: '100%',
  },
});
