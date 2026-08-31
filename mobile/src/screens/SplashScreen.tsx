import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export function SplashScreen() {
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.logoText}>Smart Kirana</Text>
        <Text style={styles.subText}>Premium Groceries</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: theme.colors.surface,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    color: theme.colors.primaryLight,
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
