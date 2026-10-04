import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type * as NotificationsType from 'expo-notifications';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Detect if currently running inside the Expo Go client app.
 * Expo SDK 53+ removed remote push notifications from Expo Go on Android.
 * Running require('expo-notifications') inside Expo Go on Android throws an uncatchable fatal error.
 */
export const isExpoGo =
  isRunningInExpoGo?.() ||
  Constants?.appOwnership === 'expo' ||
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient;

export const isExpoGoAndroid = Boolean(isExpoGo && Platform.OS === 'android');

type NotificationsModuleType = typeof NotificationsType;
let cachedNotifications: NotificationsModuleType | null = null;
let hasAttemptedLoad = false;

function getNativeNotifications(): NotificationsModuleType | null {
  if (isExpoGoAndroid || Platform.OS === 'web') {
    return null;
  }
  if (!hasAttemptedLoad) {
    hasAttemptedLoad = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('expo-notifications');
      mod?.setNotificationHandler?.({
        handleNotification: async (): Promise<NotificationsType.NotificationBehavior> =>
          ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          } as any),
      });
      cachedNotifications = mod;
    } catch {
      cachedNotifications = null;
    }
  }
  return cachedNotifications;
}

export function usePushNotifications() {
  const router = useRouter();
  const { token: authToken } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<NotificationsType.Notification | false>(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !authToken || isExpoGoAndroid) {
      return;
    }

    const Notifications = getNativeNotifications();
    if (!Notifications) return;

    let isMounted = true;

    registerForPushNotificationsAsync(Notifications)
      .then((pushToken) => {
        if (pushToken && isMounted) {
          setExpoPushToken(pushToken);
          // Register token with backend
          let deviceName = Platform.OS === 'android' ? 'Android Device' : 'iOS Device';
          try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Device = require('expo-device');
            if (Device?.modelName) deviceName = Device.modelName;
          } catch {}

          api.post('/notifications/push-token/', {
            token: pushToken,
            platform: Platform.OS,
            device_name: deviceName,
          }).catch((err) => {
            console.log('[PushNotifications] Failed to register token with backend:', err?.message);
          });
        }
      })
      .catch((err) => {
        console.log('[PushNotifications] Registration error:', err);
      });

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
        if (isMounted) setNotification(notif);
      });

      // Handle user tapping the push notification
      responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
        try {
          const data = response?.notification?.request?.content?.data;
          const orderId = data?.order_id || data?.orderId;
          if (orderId) {
            router.push(`/(tabs)/orders/${orderId}`);
          } else if (data?.type === 'NEW_ORDER' || data?.type === 'ORDER') {
            router.push('/(tabs)/orders');
          }
        } catch (err) {
          console.log('[PushNotifications] Navigation error on response:', err);
        }
      });
    } catch {
      // Ignore native listener errors
    }

    return () => {
      isMounted = false;
      try {
        if (notificationListener.current?.remove) {
          notificationListener.current.remove();
        }
        if (responseListener.current?.remove) {
          responseListener.current.remove();
        }
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [authToken, router]);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync(
  Notifications: typeof NotificationsType
): Promise<string | undefined> {
  if (Platform.OS === 'web' || isExpoGoAndroid) return undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Device = require('expo-device');

    if (Platform.OS === 'android') {
      // Register dedicated channel for Order alerts
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'New Orders & Store Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
        sound: 'default',
        enableVibrate: true,
        enableLights: true,
        bypassDnd: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Register default channel
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General Store Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        enableVibrate: true,
      });
    }

    if (!Device?.isDevice) {
      console.log('[PushNotifications] Must use physical device for Push Notifications');
      return undefined;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted by user');
      return undefined;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId ??
      'f9d70244-0cb5-46bb-afee-248399d310de';

    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return tokenResult?.data;
  } catch (err) {
    console.log('[PushNotifications] Error getting push token:', err);
    return undefined;
  }
}
