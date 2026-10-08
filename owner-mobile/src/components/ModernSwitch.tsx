import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
interface ModernSwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  trackColor?: any;
  activeThumbColor?: any;
}

const ModernSwitch: React.FC<ModernSwitchProps> = ({ value, onValueChange, disabled }) => {
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 250 });
  }, [value, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      progress.value,
      [0, 1],
      ['#64748b', '#10b981']
    );
    return {
      backgroundColor: disabled ? '#94a3b8' : bgColor,
    };
  });

  const circleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: progress.value * 22 }],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View style={[styles.track, animatedStyle]}>
        <Animated.View style={[styles.thumb, circleStyle]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: { width: 48, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
});

ModernSwitch.displayName = 'ModernSwitch';

export default React.memo(ModernSwitch);
