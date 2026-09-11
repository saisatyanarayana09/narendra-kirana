import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  BackHandler,
  ScrollView,
  Platform,
  Alert,
  Linking as RNLinking 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { navigationRef } from './navigationRef';
import { storeApi, StoreSettings } from '../api/store';
import { APP_VERSION } from '../constants/config';
import { addNotificationResponseReceivedListener } from '../services/notificationService';
import { 
  downloadAndInstallApk, 
  installDownloadedApk, 
  DEFAULT_APK_URL,
  DownloadProgressInfo 
} from '../services/updateService';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';

export { navigationRef } from './navigationRef';

export function isVersionOlder(currentVersion: string, minVersion: string): boolean {
  if (!minVersion) return false;
  const cleanCurrent = currentVersion.replace(/^[^0-9]+/, '').trim();
  const cleanMin = minVersion.replace(/^[^0-9]+/, '').trim();
  const cParts = cleanCurrent.split('.').map((p) => parseInt(p, 10) || 0);
  const mParts = cleanMin.split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(cParts.length, mParts.length);
  for (let i = 0; i < len; i++) {
    const c = cParts[i] || 0;
    const m = mParts[i] || 0;
    if (c < m) return true;
    if (c > m) return false;
  }
  return false;
}

const Stack = createNativeStackNavigator();

export interface ParsedDeepLink {
  screen: string;
  tab?: string;
  params?: any;
  requiresAuth: boolean;
}

export function parseDeepLinkUrl(url: string): ParsedDeepLink | null {
  try {
    const parsed = Linking.parse(url);
    const host = (parsed.hostname || '').toLowerCase();
    const isWebDomain = host.includes('.') || host === 'localhost';
    const rawPath = (!isWebDomain && host) ? (parsed.path ? `${host}/${parsed.path}` : host) : (parsed.path || '');
    const path = rawPath.replace(/^\/+|\/+$/g, '');
    const segments = path.split('/').filter(Boolean);

    // 1. Invoice: /orders/:id/invoice or /invoice/:id
    if (
      (segments[0] === 'orders' && segments[2] === 'invoice' && segments[1]) ||
      (segments[0] === 'order' && segments[2] === 'invoice' && segments[1]) ||
      (segments[0] === 'invoice' && segments[1])
    ) {
      const orderId = segments[0] === 'invoice' ? segments[1] : segments[1];
      return {
        screen: 'InvoiceScreen',
        tab: 'OrdersTab',
        params: { orderId },
        requiresAuth: true,
      };
    }

    // 2. Order Tracking: /orders/:id or /order/:id
    if ((segments[0] === 'orders' || segments[0] === 'order') && segments[1]) {
      return {
        screen: 'OrderTrackingScreen',
        tab: 'OrdersTab',
        params: { orderId: segments[1] },
        requiresAuth: true,
      };
    }

    // 3. Product: /product/:id or /products/:id
    if ((segments[0] === 'product' || segments[0] === 'products') && segments[1]) {
      return {
        screen: 'ProductDetailScreen',
        tab: 'HomeTab',
        params: { productId: Number(segments[1]) },
        requiresAuth: false,
      };
    }

    // 4. Offers & Promo codes: /offers or /profile/offers
    if (segments[0] === 'offers' || (segments[0] === 'profile' && segments[1] === 'offers')) {
      return {
        screen: 'OffersScreen',
        tab: 'ProfileTab',
        params: {},
        requiresAuth: true,
      };
    }

    // 5. Wallet: /wallet or /profile/wallet
    if (segments[0] === 'wallet' || (segments[0] === 'profile' && segments[1] === 'wallet')) {
      return {
        screen: 'WalletScreen',
        tab: 'ProfileTab',
        params: {},
        requiresAuth: true,
      };
    }

    // 6. Refer & Earn: /refer or /refer-and-earn or /profile/refer-and-earn
    if (
      segments[0] === 'refer' ||
      segments[0] === 'refer-and-earn' ||
      (segments[0] === 'profile' && segments[1] === 'refer-and-earn')
    ) {
      return {
        screen: 'ReferAndEarnScreen',
        tab: 'ProfileTab',
        params: {},
        requiresAuth: true,
      };
    }

    // 7. Cart & Checkout
    if (segments[0] === 'cart') {
      return {
        screen: 'CartScreen',
        tab: 'CartTab',
        params: {},
        requiresAuth: false,
      };
    }
    if (segments[0] === 'checkout') {
      return {
        screen: 'CheckoutScreen',
        tab: 'CartTab',
        params: {},
        requiresAuth: true,
      };
    }

    // 8. App Settings & Languages
    if (segments[0] === 'settings' || (segments[0] === 'profile' && segments[1] === 'settings')) {
      return {
        screen: 'AppSettingsScreen',
        tab: 'ProfileTab',
        params: {},
        requiresAuth: true,
      };
    }
    if (segments[0] === 'language' || (segments[0] === 'profile' && segments[1] === 'language')) {
      return {
        screen: 'LanguageScreen',
        tab: 'ProfileTab',
        params: {},
        requiresAuth: true,
      };
    }

    // 9. Password Reset
    if (segments[0] === 'reset-password') {
      const qp = parsed.queryParams || {};
      const rawMode = qp.mode as string | undefined;
      const mode = (rawMode === 'otp' || rawMode === 'link') 
        ? rawMode 
        : (qp.uid && qp.token ? 'link' : 'otp');

      return {
        screen: 'ResetPasswordScreen',
        params: {
          uid: (qp.uid as string) || '',
          token: (qp.token as string) || '',
          email: (qp.email as string) || '',
          mode,
        },
        requiresAuth: false,
      };
    }
    if (segments[0] === 'forgot-password') {
      return {
        screen: 'ForgotPasswordScreen',
        params: {},
        requiresAuth: false,
      };
    }

    return null;
  } catch (err) {
    console.error('Failed to parse deep link URL:', url, err);
    return null;
  }
}

const linking = {
  prefixes: [
    Linking.createURL('/'),
    'smartkirana://',
    'https://narendra-kirana.vercel.app',
    'https://narendra-kirana.onrender.com',
  ],
  config: {
    screens: {
      ResetPasswordScreen: 'reset-password',
      ForgotPasswordScreen: 'forgot-password',
      Auth: {
        screens: {
          Welcome: 'welcome',
          Login: 'login',
          Signup: 'signup',
        },
      },
      Main: {
        screens: {
          HomeTab: {
            screens: {
              HomeScreen: '',
              ProductDetailScreen: 'product/:productId',
            },
          },
          OrdersTab: {
            screens: {
              OrderHistoryScreen: 'orders',
              OrderTrackingScreen: 'orders/:orderId',
              InvoiceScreen: 'orders/:orderId/invoice',
            },
          },
          ProfileTab: {
            screens: {
              ProfileScreen: 'profile',
              OffersScreen: 'profile/offers',
              WalletScreen: 'profile/wallet',
              ReferAndEarnScreen: 'profile/refer-and-earn',
              AppSettingsScreen: 'profile/settings',
              LanguageScreen: 'profile/language',
            },
          },
          CartTab: {
            screens: {
              CartScreen: 'cart',
              CheckoutScreen: 'checkout',
            },
          },
        },
      },
    },
  },
};

export function RootNavigator() {
  const { user, isLoading, pendingRedirect, setPendingRedirect, clearPendingRedirect } = useAuth();
  const isNavReadyRef = useRef(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [checkingSettings, setCheckingSettings] = useState(false);

  const loadStoreSettings = useCallback(async () => {
    try {
      setCheckingSettings(true);
      const data = await storeApi.getSettings();
      setStoreSettings(data);
    } catch (err) {
      console.warn('[RootNavigator] Could not fetch store settings:', err);
    } finally {
      setCheckingSettings(false);
    }
  }, []);

  useEffect(() => {
    loadStoreSettings();
  }, [loadStoreSettings]);

  // Function to route or queue an incoming deep link
  const handleIncomingUrl = (url: string | null) => {
    if (!url) return;
    const target = parseDeepLinkUrl(url);
    if (!target) return;

    if (user) {
      // User is logged in: navigate straight to destination
      if (navigationRef.isReady()) {
        if (target.tab) {
          (navigationRef as any).navigate('Main', {
            screen: target.tab,
            params: {
              screen: target.screen,
              params: target.params,
            },
          });
        } else {
          (navigationRef as any).navigate('Main', {
            screen: target.screen,
            params: target.params,
          });
        }
      } else {
        setPendingRedirect({ screen: target.screen, tab: target.tab, params: target.params });
      }
    } else {
      // User is NOT logged in
      if (target.requiresAuth) {
        setPendingRedirect({ screen: target.screen, tab: target.tab, params: target.params });
        // Guide to Login screen
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate('Auth', { screen: 'Login' });
        }
      } else {
        // Public screen (e.g. ProductDetailScreen, ResetPasswordScreen)
        setPendingRedirect({ screen: target.screen, tab: target.tab, params: target.params });
        if (navigationRef.isReady()) {
          if (target.tab) {
            (navigationRef as any).navigate('Main', {
              screen: target.tab,
              params: {
                screen: target.screen,
                params: target.params,
              },
            });
          } else {
            (navigationRef as any).navigate(target.screen, target.params);
          }
        }
      }
    }
  };

  // 1. Listen for initial URL on app launch
  useEffect(() => {
    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleIncomingUrl(url);
        }
      })
      .catch((err) => {
        console.warn('[RootNavigator] Failed to get initial URL:', err);
      });

    // 2. Listen for runtime deep link events (app already open/backgrounded)
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    // 3. Listen for push notification click / tap events
    const notifSub = addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification?.request?.content?.data;
        if (data?.order_id) {
          if (navigationRef.isReady()) {
            (navigationRef as any).navigate('Main', {
              screen: 'OrdersTab',
              params: {
                screen: 'OrderTrackingScreen',
                params: { orderId: String(data.order_id) },
              },
            });
          }
        }
      } catch (e) {
        console.warn('[RootNavigator] Notification tap navigation error:', e);
      }
    });

    return () => {
      subscription?.remove?.();
      notifSub?.remove?.();
    };
  }, [user]);

  // 3. Post-Login auto-navigation: when user transitions to authenticated
  useEffect(() => {
    if (user && pendingRedirect && isNavReadyRef.current) {
      const redirect = { ...pendingRedirect };
      clearPendingRedirect();

      // Give React Navigation a short tick to switch to MainTabs
      const timer = setTimeout(() => {
        try {
          if (navigationRef.isReady()) {
            if (redirect.tab) {
              (navigationRef as any).navigate('Main', {
                screen: redirect.tab,
                params: {
                  screen: redirect.screen,
                  params: redirect.params,
                },
              });
            } else {
              (navigationRef as any).navigate('Main', {
                screen: redirect.screen,
                params: redirect.params,
              });
            }
          }
        } catch (e) {
          console.warn('[RootNavigator] Post-login redirect error:', e);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [user, pendingRedirect]);

  const { colors, isDark } = useTheme();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  // 1. Mobile Version Gate: Check if current installed version < min_mobile_version and force_app_update is True
  const isOutdated = storeSettings?.min_mobile_version
    ? isVersionOlder(APP_VERSION, storeSettings.min_mobile_version)
    : false;
  const isForceUpdateRequired = isOutdated && Boolean(storeSettings?.force_app_update);

  if (isForceUpdateRequired) {
    return (
      <ForceUpdateView
        settings={storeSettings}
        onRefresh={loadStoreSettings}
        isRefreshing={checkingSettings}
        colors={colors}
        isDark={isDark}
      />
    );
  }

  // 2. Store Maintenance Mode: If is_maintenance_mode is True, display full-screen Maintenance View
  if (storeSettings?.is_maintenance_mode) {
    return (
      <MaintenanceView
        settings={storeSettings}
        onRefresh={loadStoreSettings}
        isRefreshing={checkingSettings}
        colors={colors}
        isDark={isDark}
      />
    );
  }

  return (
    <ErrorBoundary>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        linking={linking as any}
        onReady={() => {
          isNavReadyRef.current = true;
          // If a pending redirect was queued before onReady, execute it
          if (pendingRedirect) {
            const redirect = { ...pendingRedirect };
            clearPendingRedirect();
            setTimeout(() => {
              try {
                if (navigationRef.isReady()) {
                  if (redirect.tab) {
                    (navigationRef as any).navigate('Main', {
                      screen: redirect.tab,
                      params: {
                        screen: redirect.screen,
                        params: redirect.params,
                      },
                    });
                  } else {
                    (navigationRef as any).navigate(redirect.screen, redirect.params);
                  }
                }
              } catch (e) {
                console.warn('[RootNavigator] onReady redirect error:', e);
              }
            }, 300);
          }
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="Auth" component={AuthStack} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgotPasswordScreen" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPasswordScreen" component={ResetPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

function MaintenanceView({
  settings,
  onRefresh,
  isRefreshing,
  colors,
  isDark,
}: {
  settings: StoreSettings | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  colors: any;
  isDark: boolean;
}) {
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={[styles.gateContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.gateScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gateContent}>
          <View style={[styles.gateIconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2' }]}>
            <Feather name="tool" size={42} color="#DC2626" />
          </View>

          <Text style={[styles.gateStoreTitle, { color: colors.text }]}>
            {settings?.store_name || 'Narendra Kirana Store'}
          </Text>

          <View style={[styles.gateBadge, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.4)' }]}>
            <Text style={styles.gateBadgeText}>MAINTENANCE IN PROGRESS</Text>
          </View>

          <Text style={[styles.gateHeading, { color: colors.text }]}>Under Scheduled Maintenance</Text>

          <Text style={[styles.gateDescription, { color: colors.textSecondary }]}>
            {settings?.maintenance_message ||
              'We are currently performing scheduled maintenance to serve you better. We will be back online shortly!'}
          </Text>

          {Boolean(settings?.store_phone || settings?.store_email) && (
            <View style={[styles.gateContactBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.gateContactTitle, { color: colors.text }]}>Need Urgent Assistance?</Text>
              {Boolean(settings?.store_phone) && (
                <TouchableOpacity
                  style={styles.contactRow}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => RNLinking.openURL(`tel:${settings?.store_phone}`)}
                >
                  <Feather name="phone" size={14} color={colors.primary} />
                  <Text style={[styles.contactText, { color: colors.primary }]}>{settings?.store_phone}</Text>
                </TouchableOpacity>
              )}
              {Boolean(settings?.store_email) && (
                <TouchableOpacity
                  style={styles.contactRow}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => RNLinking.openURL(`mailto:${settings?.store_email}`)}
                >
                  <Feather name="mail" size={14} color={colors.primary} />
                  <Text style={[styles.contactText, { color: colors.primary }]}>{settings?.store_email}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.gatePrimaryBtn, { backgroundColor: colors.primary }]}
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.85}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="refresh-cw" size={16} color="#FFFFFF" />
                <Text style={styles.gatePrimaryBtnText}>Check Again</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ForceUpdateView({
  settings,
  onRefresh,
  isRefreshing,
  colors,
  isDark,
}: {
  settings: StoreSettings | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  colors: any;
  isDark: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const rawUrl = settings?.app_update_url?.trim() || DEFAULT_APK_URL;
  const isAndroid = Platform.OS === 'android';
  const isPlayStore = rawUrl.includes('play.google.com') || rawUrl.startsWith('market://');
  const canInAppUpdate = isAndroid && !isPlayStore;

  const handleOpenBrowser = () => {
    RNLinking.openURL(rawUrl).catch(() => {
      RNLinking.openURL(DEFAULT_APK_URL);
    });
  };

  const handleStartInAppUpdate = async () => {
    if (downloadedUri) {
      try {
        setIsInstalling(true);
        await installDownloadedApk(downloadedUri);
      } catch (err: any) {
        Alert.alert(
          'Installation Notice',
          'Could not trigger package installer automatically. Please grant "Install unknown apps" permission if prompted, or install manually from your notifications.',
          [
            { text: 'Try Again', onPress: () => handleStartInAppUpdate() },
            { text: 'Download via Browser', onPress: handleOpenBrowser },
          ]
        );
      } finally {
        setIsInstalling(false);
      }
      return;
    }

    if (!canInAppUpdate) {
      handleOpenBrowser();
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setProgressText('Connecting to server...');
    setDownloadError(null);

    const res = await downloadAndInstallApk(rawUrl, (info: DownloadProgressInfo) => {
      setDownloadProgress(info.percent);
      setProgressText(info.progressText);
    });

    setIsDownloading(false);

    if (res.success && res.uri) {
      setDownloadedUri(res.uri);
      setProgressText('Download completed. Tap below to launch installer.');
    } else if (!res.success) {
      setDownloadError(
        res.error || 'Failed to download update. Please check your connection or download via browser.'
      );
    }
  };

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <SafeAreaView style={[styles.gateContainer, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.gateScrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.gateContent}>
          <View style={[styles.gateIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
            <Feather name={downloadedUri ? 'check-circle' : 'arrow-up-circle'} size={44} color="#059669" />
          </View>

          <Text style={[styles.gateStoreTitle, { color: colors.text }]}>
            {settings?.store_name || 'Narendra Kirana Store'}
          </Text>

          <View style={[styles.gateBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5', borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0' }]}>
            <Text style={[styles.gateBadgeText, { color: isDark ? '#34D399' : '#047857' }]}>
              {downloadedUri ? 'UPDATE READY TO INSTALL' : 'UPDATE REQUIRED'}
            </Text>
          </View>

          <Text style={[styles.gateHeading, { color: colors.text }]}>
            {downloadedUri ? 'Ready to Install Update' : 'Please Update Your App'}
          </Text>

          <Text style={[styles.gateDescription, { color: colors.textSecondary }]}>
            {settings?.app_update_message ||
              'A newer version of the app is available with essential security updates and improvements. Please update to continue shopping.'}
          </Text>

          <View style={[styles.versionPillContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.versionPillText, { color: colors.textSecondary }]}>
              Current: <Text style={{ fontWeight: '700', color: colors.text }}>v{APP_VERSION}</Text>
            </Text>
            {Boolean(settings?.min_mobile_version) && (
              <Text style={[styles.versionPillText, { color: colors.textSecondary }]}>
                Required: <Text style={{ fontWeight: '700', color: colors.primary }}>v{settings?.min_mobile_version}</Text>
              </Text>
            )}
          </View>

          {/* Download in progress box */}
          {isDownloading && (
            <View style={[styles.progressContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.progressStatsRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.progressLabelText, { color: colors.text }]}>Downloading Update...</Text>
                </View>
                <Text style={[styles.progressPercentText, { color: colors.primary }]}>{downloadProgress}%</Text>
              </View>

              <View style={[styles.progressBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${downloadProgress}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>

              <View style={styles.progressStatsRow}>
                <Text style={[styles.progressBytesText, { color: colors.textSecondary }]}>
                  {progressText || 'Downloading...'}
                </Text>
                <Text style={[styles.progressBytesText, { color: colors.textSecondary }]}>In-App Updater</Text>
              </View>
            </View>
          )}

          {/* Download ready card */}
          {Boolean(downloadedUri) && !isDownloading && (
            <View style={[styles.readyCard, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5', borderColor: '#A7F3D0' }]}>
              <Feather name="check-circle" size={20} color="#059669" />
              <Text style={[styles.readyCardText, { color: isDark ? '#34D399' : '#047857' }]}>
                Update package downloaded. Tap below to launch installation.
              </Text>
            </View>
          )}

          {/* Download error card */}
          {Boolean(downloadError) && !isDownloading && (
            <View style={[styles.errorCard, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2', borderColor: '#FCA5A5' }]}>
              <Feather name="alert-circle" size={20} color="#DC2626" />
              <Text style={[styles.errorCardText, { color: isDark ? '#F87171' : '#B91C1C' }]}>
                {downloadError}
              </Text>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            style={[
              styles.gatePrimaryBtn,
              { backgroundColor: colors.primary },
              (isDownloading || isInstalling) && { opacity: 0.8 },
            ]}
            onPress={handleStartInAppUpdate}
            disabled={isDownloading || isInstalling}
            activeOpacity={0.85}
          >
            {isDownloading || isInstalling ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.gatePrimaryBtnText}>
                  {isDownloading ? `Downloading (${downloadProgress}%)` : 'Launching Installer...'}
                </Text>
              </>
            ) : downloadedUri ? (
              <>
                <Feather name="package" size={18} color="#FFFFFF" />
                <Text style={styles.gatePrimaryBtnText}>Install Update Now</Text>
              </>
            ) : canInAppUpdate ? (
              <>
                <Feather name="download" size={18} color="#FFFFFF" />
                <Text style={styles.gatePrimaryBtnText}>1-Tap In-App Update</Text>
              </>
            ) : (
              <>
                <Feather name="external-link" size={18} color="#FFFFFF" />
                <Text style={styles.gatePrimaryBtnText}>Update on Google Play</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action / Fallback links */}
          {canInAppUpdate && !isDownloading && (
            <TouchableOpacity
              style={styles.browserLinkBtn}
              onPress={handleOpenBrowser}
              activeOpacity={0.7}
            >
              <Text style={[styles.browserLinkBtnText, { color: colors.primary }]}>
                Or download via web browser
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.gateSecondaryBtn, { borderColor: colors.border }]}
            onPress={onRefresh}
            disabled={isRefreshing || isDownloading}
            activeOpacity={0.8}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <>
                <Feather name="refresh-cw" size={14} color={colors.text} />
                <Text style={[styles.gateSecondaryBtnText, { color: colors.text }]}>I've Already Updated</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gateContainer: {
    flex: 1,
  },
  gateScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  gateContent: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  gateIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  gateStoreTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  gateBadge: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 16,
  },
  gateBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  gateHeading: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  gateDescription: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  gateContactBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  gateContactTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionPillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  versionPillText: {
    fontSize: 13,
  },
  gatePrimaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gatePrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  gateSecondaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  gateSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  progressStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  progressLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressPercentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressBytesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  readyCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  readyCardText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    lineHeight: 18,
  },
  errorCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorCardText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  browserLinkBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browserLinkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
