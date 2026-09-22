import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { getItem, saveItem } from "./storage";

export const STORAGE_VIBRATION_KEY = "sk_vibration_enabled";

let isVibrationActive = true;

// Initialize vibration preference from persistent storage safely
getItem(STORAGE_VIBRATION_KEY)
  .then((val) => {
    if (val !== null) {
      isVibrationActive = val !== "false";
    }
  })
  .catch(() => {});

export const getVibrationEnabled = (): boolean => isVibrationActive;

export const setVibrationEnabled = async (enabled: boolean): Promise<void> => {
  isVibrationActive = enabled;
  await saveItem(STORAGE_VIBRATION_KEY, enabled ? "true" : "false").catch(
    () => {},
  );
  if (enabled) {
    triggerHaptic("medium");
  }
};

export const triggerHaptic = (
  type:
    | "light"
    | "medium"
    | "heavy"
    | "selection"
    | "success"
    | "warning"
    | "error" = "light",
) => {
  if (Platform.OS === "web" || !isVibrationActive) return;

  try {
    let p: Promise<void> | undefined;
    switch (type) {
      case "light":
        p = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        p = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        p = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "selection":
        p = Haptics.selectionAsync();
        break;
      case "success":
        p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        p = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
    p?.catch(() => {});
  } catch (error) {
    // Graceful fallback
  }
};
