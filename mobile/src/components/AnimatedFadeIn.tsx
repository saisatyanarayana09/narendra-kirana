import React, { useEffect, useRef } from 'react';
import { Animated, Platform, ViewStyle, StyleProp } from 'react-native';

interface AnimatedFadeInProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  style?: StyleProp<ViewStyle>;
  scaleFrom?: number;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * Reusable fade-in + slide animation wrapper.
 * Wrap any component to animate it on mount with optional stagger via `index`.
 *
 * Usage:
 *   <AnimatedFadeIn index={idx}>
 *     <ProductCard ... />
 *   </AnimatedFadeIn>
 */
export function AnimatedFadeIn({
  children,
  index = 0,
  delay = 0,
  duration = 400,
  direction = 'up',
  distance = 24,
  style,
  scaleFrom,
}: AnimatedFadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    direction === 'down' ? -distance :
    direction === 'left' ? distance :
    direction === 'right' ? -distance :
    distance // 'up' or 'none'
  )).current;
  const scale = useRef(new Animated.Value(scaleFrom ?? 1)).current;

  useEffect(() => {
    const staggerDelay = delay + index * 60; // 60ms stagger per item

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay: staggerDelay,
        useNativeDriver: USE_NATIVE_DRIVER,
      }),
      ...(direction !== 'none' ? [
        Animated.timing(translate, {
          toValue: 0,
          duration,
          delay: staggerDelay,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ] : []),
      ...(scaleFrom != null ? [
        Animated.timing(scale, {
          toValue: 1,
          duration,
          delay: staggerDelay,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ] : []),
    ]).start();
  }, []);

  const translateKey =
    direction === 'left' || direction === 'right' ? 'translateX' : 'translateY';

  const transform: any[] = [];
  if (direction !== 'none') {
    transform.push({ [translateKey]: translate });
  }
  if (scaleFrom != null) {
    transform.push({ scale });
  }

  return (
    <Animated.View
      style={[
        { opacity, transform },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export default AnimatedFadeIn;
