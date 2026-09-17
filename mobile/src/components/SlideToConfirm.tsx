import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  LayoutChangeEvent,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { triggerHaptic } from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

export interface SlideToConfirmProps {
  onConfirm: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  amount?: number | string;
  label?: string;
  sliderColor?: string;
  thumbColor?: string;
  textColor?: string;
  style?: StyleProp<ViewStyle>;
}

const TRACK_HEIGHT = 56;
const THUMB_SIZE = 46;
const TRACK_PADDING = 5;

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  disabled = false,
  isSubmitting = false,
  amount,
  label,
  sliderColor,
  thumbColor,
  textColor,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const thumbX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const isConfirmedRef = useRef(false);
  const lastMilestoneRef = useRef(0);

  const maxSlide = Math.max(0, trackWidth - THUMB_SIZE - TRACK_PADDING * 2);
  const maxSlideRef = useRef(maxSlide);
  maxSlideRef.current = maxSlide;

  // Storing mutable state in ref to avoid stale closures in PanResponder
  const stateRef = useRef({
    disabled,
    isSubmitting,
    onConfirm,
  });
  stateRef.current = {
    disabled,
    isSubmitting,
    onConfirm,
  };

  useEffect(() => {
    const listenerId = thumbX.addListener(({ value }) => {
      currentX.current = value;
    });
    return () => {
      thumbX.removeListener(listenerId);
    };
  }, [thumbX]);

  // Reset slider if submission completes or disabled changes
  useEffect(() => {
    if (!isSubmitting) {
      isConfirmedRef.current = false;
      Animated.spring(thumbX, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: false,
      }).start();
    }
  }, [isSubmitting, thumbX]);

  useEffect(() => {
    if (disabled) {
      isConfirmedRef.current = false;
      Animated.spring(thumbX, {
        toValue: 0,
        friction: 7,
        tension: 60,
        useNativeDriver: false,
      }).start();
    }
  }, [disabled, thumbX]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !stateRef.current.disabled && !stateRef.current.isSubmitting && !isConfirmedRef.current,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !stateRef.current.disabled &&
          !stateRef.current.isSubmitting &&
          !isConfirmedRef.current &&
          Math.abs(gesture.dx) > 4,
        onPanResponderGrant: () => {
          if (stateRef.current.disabled || stateRef.current.isSubmitting || isConfirmedRef.current) return;
          lastMilestoneRef.current = 0;
          triggerHaptic('light');
        },
        onPanResponderMove: (_, gesture) => {
          if (stateRef.current.disabled || stateRef.current.isSubmitting || isConfirmedRef.current) return;
          const max = maxSlideRef.current;
          if (max <= 0) return;

          const rawX = Math.max(0, Math.min(gesture.dx, max));
          thumbX.setValue(rawX);

          // Progressive haptic clicks during drag at 25%, 50%, 75%
          const ratio = rawX / max;
          const milestone = Math.floor(ratio / 0.25);
          if (milestone > lastMilestoneRef.current && milestone < 4) {
            lastMilestoneRef.current = milestone;
            triggerHaptic('selection');
          } else if (milestone < lastMilestoneRef.current) {
            lastMilestoneRef.current = milestone;
          }
        },
        onPanResponderRelease: () => {
          if (stateRef.current.disabled || stateRef.current.isSubmitting || isConfirmedRef.current) return;
          const max = maxSlideRef.current;
          if (max <= 0) return;

          const threshold = max * 0.85;
          if (currentX.current >= threshold) {
            isConfirmedRef.current = true;
            triggerHaptic('success');
            Animated.timing(thumbX, {
              toValue: max,
              duration: 150,
              useNativeDriver: false,
            }).start(() => {
              stateRef.current.onConfirm();
            });
          } else {
            Animated.spring(thumbX, {
              toValue: 0,
              friction: 7,
              tension: 60,
              useNativeDriver: false,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          if (isConfirmedRef.current) return;
          Animated.spring(thumbX, {
            toValue: 0,
            friction: 7,
            tension: 60,
            useNativeDriver: false,
          }).start();
        },
      }),
    [thumbX]
  );

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width && width !== trackWidth) {
      setTrackWidth(width);
    }
  };

  const effectivePrimaryColor = sliderColor || colors.primary;
  const effectiveThumbColor = thumbColor || '#FFFFFF';
  const effectiveTextColor = textColor || '#FFFFFF';

  const defaultDisplayLabel = useMemo(() => {
    if (isSubmitting) return 'Processing Order...';
    if (label) return label;
    if (amount !== undefined) {
      const amountStr = typeof amount === 'number' ? amount.toFixed(2) : amount;
      return `Swipe to Place Order • ₹${amountStr}`;
    }
    return 'Swipe to Place Order';
  }, [isSubmitting, label, amount]);

  // Fade out label as thumb slides across
  const textOpacity = thumbX.interpolate({
    inputRange: [0, Math.max(1, maxSlide * 0.65)],
    outputRange: [1, 0.15],
    extrapolate: 'clamp',
  });

  // Track fill behind the thumb
  const trackFillWidth = Animated.add(thumbX, THUMB_SIZE + TRACK_PADDING * 2);

  const isInteractiveDisabled = disabled || isSubmitting;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isInteractiveDisabled
            ? isDark
              ? '#1E293B'
              : '#E2E8F0'
            : effectivePrimaryColor,
        },
        style,
      ]}
      onLayout={handleLayout}
      accessibilityRole="button"
      accessibilityLabel={defaultDisplayLabel}
      accessibilityState={{ disabled: isInteractiveDisabled, busy: isSubmitting }}
    >
      {/* Active Fill Background Behind Thumb */}
      {!isInteractiveDisabled && (
        <Animated.View
          style={[
            styles.trackFill,
            {
              width: trackFillWidth,
              backgroundColor: isDark ? '#047857' : '#047857',
            },
          ]}
        />
      )}

      {/* Label Text */}
      <Animated.View style={[styles.textWrapper, { opacity: isInteractiveDisabled ? 0.6 : textOpacity }]}>
        <Text
          style={[
            styles.labelText,
            {
              color: isInteractiveDisabled
                ? isDark
                  ? '#94A3B8'
                  : '#64748B'
                : effectiveTextColor,
            },
          ]}
          numberOfLines={1}
        >
          {defaultDisplayLabel}
        </Text>
      </Animated.View>

      {/* Draggable Circular Thumb */}
      <Animated.View
        style={[
          styles.thumb,
          {
            backgroundColor: isInteractiveDisabled
              ? isDark
                ? '#334155'
                : '#CBD5E1'
              : effectiveThumbColor,
            transform: [{ translateX: thumbX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={effectivePrimaryColor} />
        ) : (
          <Feather
            name="chevrons-right"
            size={22}
            color={
              isInteractiveDisabled
                ? isDark
                  ? '#64748B'
                  : '#94A3B8'
                : effectivePrimaryColor
            }
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    justifyContent: 'center',
    padding: TRACK_PADDING,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
    opacity: 0.45,
  },
  textWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THUMB_SIZE + 12,
  },
  labelText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default SlideToConfirm;
