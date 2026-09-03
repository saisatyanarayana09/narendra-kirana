import React, { useEffect, useRef } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator();
export const navigationRef = createNavigationContainerRef<any>();

export interface ParsedDeepLink {
  screen: string;
  tab?: string;
  params?: any;
  requiresAuth: boolean;
}

export function parseDeepLinkUrl(url: string): ParsedDeepLink | null {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path || '').replace(/^\/+|\/+$/g, '');
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

  // Function to route or queue an incoming deep link
  const handleIncomingUrl = (url: string | null) => {
    if (!url) return;
    const target = parseDeepLinkUrl(url);
    if (!target) return;

    if (user) {
      // User is logged in: navigate straight to destination
      if (navigationRef.isReady()) {
        if (target.tab) {
          navigationRef.navigate(target.tab, {
            screen: target.screen,
            params: target.params,
          });
        } else {
          navigationRef.navigate(target.screen, target.params);
        }
      } else {
        setPendingRedirect({ screen: target.screen, params: target.params });
      }
    } else {
      // User is NOT logged in
      if (target.requiresAuth) {
        setPendingRedirect({ screen: target.screen, params: target.params });
        // Guide to Login screen
        if (navigationRef.isReady()) {
          navigationRef.navigate('Login');
        }
      } else {
        // Public screen (e.g. ProductDetailScreen)
        setPendingRedirect({ screen: target.screen, params: target.params });
      }
    }
  };

  // 1. Listen for initial URL on app launch
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleIncomingUrl(url);
      }
    });

    // 2. Listen for runtime deep link events (app already open/backgrounded)
    const subscription = Linking.addEventListener('url', (event) => {
      handleIncomingUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  // 3. Post-Login auto-navigation: when user transitions to authenticated
  useEffect(() => {
    if (user && pendingRedirect && isNavReadyRef.current) {
      const redirect = { ...pendingRedirect };
      clearPendingRedirect();

      // Give React Navigation a short tick to switch to MainTabs
      const timer = setTimeout(() => {
        if (navigationRef.isReady()) {
          (navigationRef as any).navigate(redirect.screen, redirect.params);
        }
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [user, pendingRedirect]);

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking as any}
      onReady={() => {
        isNavReadyRef.current = true;
        // If a pending redirect was queued before onReady, execute it if user is logged in
        if (user && pendingRedirect) {
          const redirect = { ...pendingRedirect };
          clearPendingRedirect();
          setTimeout(() => {
            (navigationRef as any).navigate(redirect.screen, redirect.params);
          }, 300);
        }
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
