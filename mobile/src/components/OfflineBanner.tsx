import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OfflineBanner() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const slideAnim = useState(new Animated.Value(-100))[0];
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      // In simulator, it sometimes returns null, so default to true if null
      const connected = state.isConnected ?? true;
      setIsConnected(connected);

      if (!connected) {
        // Slide down
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // Slide up
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => unsubscribe();
  }, [slideAnim]);

  if (isConnected) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          transform: [{ translateY: slideAnim }],
          paddingTop: Math.max(insets.top, 16),
        }
      ]}
    >
      <WifiOff size={16} color={theme.colors.surface} />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  text: {
    color: theme.colors.surface,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
});
