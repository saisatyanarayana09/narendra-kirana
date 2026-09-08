import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { apiClient } from '../api/client';
import { getItem, saveItem, deleteItem } from '../utils/storage';

const PUSH_TOKEN_KEY = 'user_device_push_token';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Configure high-priority Android notification channels for order updates
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
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
      console.warn('[NotificationService] Error setting up Android channels:', error);
    }
  }
}

/**
 * Requests push permissions and registers the Expo push token with the Django backend
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Setup Android channels first
    await setupNotificationChannels();

    // Check if running on a physical device (Expo push tokens require physical device)
    if (!Device.isDevice) {
      console.log('[NotificationService] Running in emulator/simulator. Push notifications may be simulated.');
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

    // Get Expo push token
    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    token = pushTokenData.data;

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
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Attach notification response listener (fires when user taps on lock-screen notification banner)
 */
export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
