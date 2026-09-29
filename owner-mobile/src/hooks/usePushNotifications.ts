import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (): Promise<Notifications.NotificationBehavior> =>
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
  const [notification, setNotification] = useState<Notifications.Notification | false>(false);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !authToken) {
      return;
    }

    let isMounted = true;

    registerForPushNotificationsAsync()
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

async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
      });
    }

    if (!Device.isDevice) {
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
