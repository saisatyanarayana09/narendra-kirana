import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const { colors, isDark } = useTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: isDark ? colors.border : '#E2E8F0',
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.productCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <SkeletonItem width="100%" height={132} borderRadius={14} />
      <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, flex: 1, justifyContent: 'space-between' }}>
        <SkeletonItem width="45%" height={12} borderRadius={4} />
        <SkeletonItem width="92%" height={30} borderRadius={4} />
        <SkeletonItem width="50%" height={14} borderRadius={4} />
        <SkeletonItem width="40%" height={18} borderRadius={4} />
        <SkeletonItem width="100%" height={38} borderRadius={10} />
      </View>
    </View>
  );
}

export function CategoryCardSkeleton() {
  const cardSize = (width - 28 - 20) / 3;
  return (
    <View style={{ width: cardSize, aspectRatio: 1 }}>
      <SkeletonItem width="100%" height="100%" borderRadius={16} />
    </View>
  );
}

export function BannerSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 18 }}>
      <SkeletonItem width="100%" height={140} borderRadius={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 296,
    width: '100%',
    overflow: 'hidden',
  },
});
