import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
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
          api.post('/notifications/push-token/', { token: pushToken }).catch(() => {});
        }
      })
      .catch(() => {});

    try {
      notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
        if (isMounted) setNotification(notif);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});
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
  }, [authToken]);

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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });
    }

    if (!Device?.isDevice) {
      return undefined;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return undefined;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync();
    return tokenResult?.data;
  } catch {
    return undefined;
  }
}
