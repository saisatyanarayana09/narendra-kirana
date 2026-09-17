import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { subscribeOtaState, applyOtaUpdate } from '../services/otaService';
import { triggerHaptic } from '../utils/haptics';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';
const AUTO_DISMISS_MS = 7000;

export function OtaUpdateBanner() {
  const insets = useSafeAreaInsets();
  const [isPending, setIsPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const countdownAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeOtaState((state) => {
      setIsPending(state.isUpdatePending);
    });
    return () => unsubscribe();
  }, []);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerHaptic('light');
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start(() => {
      setDismissed(true);
    });
  }, [slideAnim]);

  useEffect(() => {
    if (isPending && !dismissed) {
      slideAnim.setValue(-120);
      countdownAnim.setValue(1);

      // Slide down entrance
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: USE_NATIVE_DRIVER,
        tension: 80,
        friction: 9,
      }).start();

      // Smooth 7s auto-dismiss progress countdown
      Animated.timing(countdownAnim, {
        toValue: 0,
        duration: AUTO_DISMISS_MS,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();

      // Automatically slide away and disappear after 7 seconds
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handleDismiss();
      }, AUTO_DISMISS_MS);
    } else {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPending, dismissed, slideAnim, countdownAnim, handleDismiss]);

  if (!isPending || dismissed) return null;

  const handleRestart = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerHaptic('medium');
    applyOtaUpdate();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top, 12),
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.leftGroup}>
          <View style={styles.iconCircle}>
            <Text style={styles.emojiIcon}>✨</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Update Ready</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Restart app to apply new features
            </Text>
          </View>
        </View>

        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={handleRestart}
            activeOpacity={0.85}
          >
            <Feather name="refresh-cw" size={12} color="#064E3B" style={{ marginRight: 4 }} />
            <Text style={styles.restartBtnText}>Restart</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Subtle auto-dismiss countdown bar at bottom */}
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                transform: [{ scaleX: countdownAnim }],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 999999,
    elevation: 25,
  },
  banner: {
    backgroundColor: '#064E3B',
    borderRadius: 16,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#34D399',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emojiIcon: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  subtitle: {
    color: '#A7F3D0',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE047',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  restartBtnText: {
    color: '#064E3B',
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '800',
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  progressBarFill: {
    height: '100%',
    width: '100%',
    backgroundColor: '#FDE047',
  },
});
