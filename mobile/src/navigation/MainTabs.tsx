import React, { useState, useEffect, useRef } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { WelcomeScreen } from '../components/WelcomeScreen';

import { HomeScreen } from '../screens/home/HomeScreen';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { ProductListScreen } from '../screens/products/ProductListScreen';
import { ProductDetailScreen } from '../screens/products/ProductDetailScreen';
import { SearchScreen } from '../screens/products/SearchScreen';
import { FavoritesScreen } from '../screens/favorites/FavoritesScreen';

import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/orders/OrderSuccessScreen';
import { OrderHistoryScreen } from '../screens/orders/OrderHistoryScreen';
import { OrderTrackingScreen } from '../screens/orders/OrderTrackingScreen';
import { InvoiceScreen } from '../screens/orders/InvoiceScreen';
import { AddAddressScreen } from '../screens/profile/AddAddressScreen';
import { AddressesScreen } from '../screens/profile/AddressesScreen';
import { WalletScreen } from '../screens/profile/WalletScreen';
import { ReferAndEarnScreen } from '../screens/profile/ReferAndEarnScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AccountSettingsScreen } from '../screens/profile/AccountSettingsScreen';
import { NotificationsScreen } from '../screens/profile/NotificationsScreen';

export type MainTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
  CartTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<any>();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="ProductDetailScreen" component={ProductDetailScreen} />
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="ProductListScreen" component={ProductListScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="InvoiceScreen" component={InvoiceScreen} />
    </Stack.Navigator>
  );
}

function CategoriesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CategoriesScreen" component={CategoriesScreen} />
      <Stack.Screen name="ProductListScreen" component={ProductListScreen} />
      <Stack.Screen name="ProductDetailScreen" component={ProductDetailScreen} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="InvoiceScreen" component={InvoiceScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="InvoiceScreen" component={InvoiceScreen} />
      <Stack.Screen name="AddressesScreen" component={AddressesScreen} />
      <Stack.Screen name="AddAddressScreen" component={AddAddressScreen} />
      <Stack.Screen name="WalletScreen" component={WalletScreen} />
      <Stack.Screen name="ReferAndEarnScreen" component={ReferAndEarnScreen} />
      <Stack.Screen name="AccountSettingsScreen" component={AccountSettingsScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <Stack.Screen name="FavoritesScreen" component={FavoritesScreen} />
    </Stack.Navigator>
  );
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartScreen" component={CartScreen} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <Stack.Screen name="OrderSuccessScreen" component={OrderSuccessScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="InvoiceScreen" component={InvoiceScreen} />
      <Stack.Screen name="AddAddressScreen" component={AddAddressScreen} />
    </Stack.Navigator>
  );
}

import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getHasShownWelcomeSession } from '../utils/welcomeSession';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { triggerHaptic } from '../utils/haptics';

const shouldHideTabBar = (route: any) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? '';
  const hideOnScreens = [
    'ProductDetailScreen',
    'CheckoutScreen',
    'OrderSuccessScreen',
    'OrderTrackingScreen',
    'InvoiceScreen',
    'AddAddressScreen',
  ];
  return hideOnScreens.includes(routeName);
};

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { cart } = useCart();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState('HomeTab');
  const [currentRouteName, setCurrentRouteName] = useState('');
  const [isDismissed, setIsDismissed] = useState(false);

  // Cart popup bar should only come after welcome screen is completed
  const willShowWelcome = Boolean(user && !getHasShownWelcomeSession());
  const [isWelcomeActive, setIsWelcomeActive] = useState(willShowWelcome);

  const cartItemCount = cart?.items?.length || 0;
  const prevCountRef = useRef(cartItemCount);
  const hasShownInitialOnAppOpenRef = useRef(false);

  // 1. Show once on app open if user has items in cart, ONLY AFTER welcome screen completes!
  useEffect(() => {
    if (!isWelcomeActive && cartItemCount > 0 && !hasShownInitialOnAppOpenRef.current) {
      hasShownInitialOnAppOpenRef.current = true;
      setIsDismissed(false);
    }
  }, [cartItemCount, isWelcomeActive]);

  // 2. Re-show only when user actively adds an item while shopping
  useEffect(() => {
    if (!isWelcomeActive && cartItemCount > prevCountRef.current) {
      setIsDismissed(false);
    }
    prevCountRef.current = cartItemCount;
  }, [cartItemCount, isWelcomeActive]);

  // Optimize Android bottom padding
  const bottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 4 : 0,
    Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom : 10) : 12
  );
  const totalBarHeight = 58 + bottomPadding;

  return (
    <View style={{ flex: 1 }}>
      <WelcomeScreen 
        onStart={() => setIsWelcomeActive(true)}
        onFinish={() => setIsWelcomeActive(false)}
      />

      <Tab.Navigator
        screenListeners={{
          state: (e: any) => {
            const route = e.data?.state?.routes?.[e.data?.state?.index];
            if (route?.name && route.name !== currentTab) {
              setCurrentTab(route.name);
              triggerHaptic('selection');
            }
            if (route) {
              const deepName = getFocusedRouteNameFromRoute(route) ?? route.name;
              setCurrentRouteName(deepName);
            }
          },
        }}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#059669', // Emerald-600 matching web
          tabBarInactiveTintColor: '#64748B', // Slate-500 matching web
          tabBarItemStyle: {
            paddingBottom: 4,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            fontFamily: 'Nunito_700Bold',
            marginTop: 2,
          },
        }}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeStack}
          options={({ route }) => ({
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={20} />,
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : [styles.tabBar, { height: totalBarHeight, paddingBottom: bottomPadding }],
          })}
        />
        <Tab.Screen 
          name="CategoriesTab" 
          component={CategoriesStack}
          options={({ route }) => ({
            tabBarLabel: 'Categories',
            tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={20} />,
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : [styles.tabBar, { height: totalBarHeight, paddingBottom: bottomPadding }],
          })}
        />
        <Tab.Screen 
          name="OrdersTab" 
          component={OrdersStack}
          options={({ route }) => ({
            tabBarLabel: 'Orders',
            tabBarIcon: ({ color, size }) => <Feather name="package" color={color} size={20} />,
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : [styles.tabBar, { height: totalBarHeight, paddingBottom: bottomPadding }],
          })}
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileStack}
          options={({ route }) => ({
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={20} />,
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : [styles.tabBar, { height: totalBarHeight, paddingBottom: bottomPadding }],
          })}
        />
        <Tab.Screen 
          name="CartTab" 
          component={CartStack}
          options={({ route }) => ({
            tabBarLabel: 'Cart',
            tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#0F172A', // slate-900 matching web
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '900',
              minWidth: 18,
              paddingHorizontal: 4,
              height: 18,
              borderRadius: 9,
              textAlign: 'center',
            },
            tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" color={color} size={20} />,
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : [styles.tabBar, { height: totalBarHeight, paddingBottom: bottomPadding }],
          })}
        />
      </Tab.Navigator>

      {/* Floating Mini-Cart Bar rendered after Tab.Navigator only after welcome screen has completed */}
      {!isWelcomeActive && currentTab !== 'CartTab' && cartItemCount > 0 && !isDismissed && (
        <FloatingCartBar 
          bottomOffset={totalBarHeight + 10}
          onPress={() => navigation.navigate('CartTab')}
          onClose={() => setIsDismissed(true)}
          currentRouteName={currentRouteName}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    paddingTop: 8,
  },
});

