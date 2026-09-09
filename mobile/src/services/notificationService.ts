import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { apiClient } from '../api/client';
import { getItem, saveItem, deleteItem } from '../utils/storage';

const PUSH_TOKEN_KEY = 'user_device_push_token';

/**
 * Detect if currently running inside the Expo Go app client.
 * Expo SDK 53+ removed remote FCM push notification token support from Expo Go on Android.
 */
export const isExpoGo =
  isRunningInExpoGo() ||
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

export const isExpoGoAndroid = isExpoGo && Platform.OS === 'android';

// Lazy-load expo-notifications only when NOT running in Expo Go on Android.
// Statically importing expo-notifications executes DevicePushTokenAutoRegistration.fx at startup,
// which invokes warnOfExpoGoPushUsage and throws an uncatchable runtime error in Expo Go SDK 53+ on Android.
type NotificationsModuleType = typeof import('expo-notifications');
let NotificationsModule: NotificationsModuleType | null = null;

function getNotifications(): NotificationsModuleType | null {
  if (isExpoGoAndroid) {
    return null;
  }
  if (!NotificationsModule) {
    try {
      NotificationsModule = require('expo-notifications');
      NotificationsModule?.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (err) {
      console.log('[NotificationService] Notice: could not load expo-notifications:', err);
      NotificationsModule = null;
    }
  }
  return NotificationsModule;
}

// Initialize handler eagerly when running in standalone or dev builds
if (!isExpoGoAndroid) {
  getNotifications();
}

/**
 * Configure high-priority Android notification channels for order updates
 */
export async function setupNotificationChannels(): Promise<void> {
  const Notifications = getNotifications();
  if (Platform.OS === 'android' && Notifications) {
    try {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Order Updates & Delivery',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      await Notifications.setNotificationChannelAsync('general', {
        name: 'Offers & Announcements',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    } catch (error) {
      console.log('[NotificationService] Notice: Android notification channels skipped:', error);
    }
  }
}

/**
 * Requests push permissions and registers the Expo push token with the Django backend.
 * In Expo Go on Android (Expo SDK 53+), remote push notifications are not supported
 * by the prebuilt Expo Go client. In that case, this function gracefully logs a notice
 * and returns null without throwing, preserving full functionality for development and production builds.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // In Expo Go on Android, remote push notification tokens are restricted by Expo SDK 53+
  if (isExpoGoAndroid) {
    console.log(
      '[NotificationService] Notice: Remote push tokens are disabled in Expo Go on Android (Expo SDK 53+ requirement). Skipping remote token registration; local notifications and in-app updates remain fully active. For remote push on physical device, use a development build (expo-dev-client) or standalone APK.'
    );
    return null;
  }

  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  let token: string | null = null;

  try {
    // Setup Android channels first
    await setupNotificationChannels();

    // Check if running on a physical device (push tokens require physical device)
    if (!Device.isDevice) {
      console.log('[NotificationService] Running in emulator/simulator. Remote push tokens unavailable.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NotificationService] Push notification permission not granted by user.');
      return null;
    }

    // Safely retrieve Expo push token
    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

      const pushTokenData = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      token = pushTokenData?.data || null;
    } catch (tokenErr: any) {
      console.log(
        '[NotificationService] Could not obtain push token (safe fallback for Expo Go without EAS credentials):',
        tokenErr?.message || tokenErr
      );
      return null;
    }

    if (token) {
      // Check if already registered to avoid redundant backend requests
      const lastToken = await getItem(PUSH_TOKEN_KEY);
      if (lastToken !== token) {
        // Register token with Django backend
        await apiClient.post('/notifications/push-token/', {
          token,
          platform: Platform.OS,
          device_name: Device.modelName || (Platform.OS === 'android' ? 'Android Device' : 'iOS Device'),
        });
        await saveItem(PUSH_TOKEN_KEY, token);
        console.log('[NotificationService] Push token registered successfully with backend:', token);
      }
    }
  } catch (error) {
    console.warn('[NotificationService] Failed to register push token:', error);
  }

  return token;
}

/**
 * Unregisters the push token with backend on logout
 */
export async function unregisterPushNotificationsAsync(): Promise<void> {
  try {
    const token = await getItem(PUSH_TOKEN_KEY);
    if (token) {
      await apiClient.post('/notifications/push-token/delete/', { token }).catch(() => {});
      await deleteItem(PUSH_TOKEN_KEY);
      console.log('[NotificationService] Push token unregistered.');
    }
  } catch (error) {
    console.warn('[NotificationService] Failed to unregister push token:', error);
  }
}

/**
 * Attach notification received listener (fires when notification arrives while app is foregrounded)
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): { remove: () => void } {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationReceivedListener(callback);
  } catch (err) {
    console.log('[NotificationService] Notice: addNotificationReceivedListener skipped:', err);
    return { remove: () => {} };
  }
}

/**
 * Attach notification response listener (fires when user taps on lock-screen notification banner)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): { remove: () => void } {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (err) {
    console.log('[NotificationService] Notice: addNotificationResponseReceivedListener skipped:', err);
    return { remove: () => {} };
  }
}
