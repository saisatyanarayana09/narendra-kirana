import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function getNativeNotifications(): typeof NotificationsType | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

if (Platform.OS !== 'web') {
  try {
    const Notifications = getNativeNotifications();
    Notifications?.setNotificationHandler({
      handleNotification: async (): Promise<NotificationsType.NotificationBehavior> =>
        ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        } as any),
    });
  } catch {
    // Ignore native module initialization errors on unsupported environments
  }
}

export function usePushNotifications() {
  const { token: authToken } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<NotificationsType.Notification | false>(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !authToken) {
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
  if (Platform.OS === 'web') return undefined;

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
