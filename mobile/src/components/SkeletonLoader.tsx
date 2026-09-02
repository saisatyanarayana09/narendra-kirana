import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export function SkeletonItem({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
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
          backgroundColor: '#E2E8F0',
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <View style={styles.productCard}>
      <SkeletonItem width="100%" height={128} borderRadius={14} />
      <View style={{ padding: 10, gap: 6, flex: 1 }}>
        <SkeletonItem width="40%" height={10} borderRadius={4} />
        <SkeletonItem width="90%" height={14} borderRadius={4} />
        <SkeletonItem width="60%" height={12} borderRadius={4} />
        <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonItem width="35%" height={16} borderRadius={4} />
          <SkeletonItem width="50%" height={34} borderRadius={10} />
        </View>
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
    height: 284,
    width: '100%',
    overflow: 'hidden',
  },
});
