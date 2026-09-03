import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { getItem, saveItem } from './storage';

export const STORAGE_VIBRATION_KEY = 'sk_vibration_enabled';

let isVibrationActive = true;

// Initialize vibration preference from persistent storage
getItem(STORAGE_VIBRATION_KEY).then((val) => {
  if (val !== null) {
    isVibrationActive = val !== 'false';
  }
});

export const getVibrationEnabled = (): boolean => isVibrationActive;

export const setVibrationEnabled = async (enabled: boolean): Promise<void> => {
  isVibrationActive = enabled;
  await saveItem(STORAGE_VIBRATION_KEY, enabled ? 'true' : 'false');
  if (enabled) {
    triggerHaptic('medium');
  }
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light') => {
  if (Platform.OS === 'web' || !isVibrationActive) return;

  try {
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  } catch (error) {
    // Graceful fallback
  }
};
