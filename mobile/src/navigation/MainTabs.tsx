import React, { useState, useEffect, useRef } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
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
import { AppSettingsScreen } from '../screens/profile/AppSettingsScreen';
import { OffersScreen } from '../screens/profile/OffersScreen';
import { LanguageScreen } from '../screens/profile/LanguageScreen';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getHasShownWelcomeSession } from '../utils/welcomeSession';
import { FloatingCartBar } from '../components/FloatingCartBar';
import { triggerHaptic } from '../utils/haptics';
import { loadHomeData } from '../services/homeDataCache';
import { loadCachedOrders } from '../services/ordersCache';
import { navigationRef } from './navigationRef';

export type MainTabParamList = {
  HomeTab: undefined;
  CategoriesTab: undefined;
  OrdersTab: undefined;
  ProfileTab: undefined;
  CartTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStackNav = createNativeStackNavigator<any>();
const CategoriesStackNav = createNativeStackNavigator<any>();
const OrdersStackNav = createNativeStackNavigator<any>();
const ProfileStackNav = createNativeStackNavigator<any>();
const CartStackNav = createNativeStackNavigator<any>();

function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeScreen" component={HomeScreen} />
      <HomeStackNav.Screen name="ProductDetailScreen" component={ProductDetailScreen} />
      <HomeStackNav.Screen name="SearchScreen" component={SearchScreen} />
      <HomeStackNav.Screen name="ProductListScreen" component={ProductListScreen} />
      <HomeStackNav.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <HomeStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
    </HomeStackNav.Navigator>
  );
}

function CategoriesStack() {
  return (
    <CategoriesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CategoriesStackNav.Screen name="CategoriesScreen" component={CategoriesScreen} />
      <CategoriesStackNav.Screen name="ProductListScreen" component={ProductListScreen} />
      <CategoriesStackNav.Screen name="ProductDetailScreen" component={ProductDetailScreen} />
    </CategoriesStackNav.Navigator>
  );
}

function OrdersStack() {
  return (
    <OrdersStackNav.Navigator screenOptions={{ headerShown: false }}>
      <OrdersStackNav.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <OrdersStackNav.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <OrdersStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
    </OrdersStackNav.Navigator>
  );
}

function ProfileStack() {
  return (
    <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStackNav.Screen name="ProfileScreen" component={ProfileScreen} />
      <ProfileStackNav.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <ProfileStackNav.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <ProfileStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
      <ProfileStackNav.Screen name="AddressesScreen" component={AddressesScreen} />
      <ProfileStackNav.Screen name="AddAddressScreen" component={AddAddressScreen} />
      <ProfileStackNav.Screen name="WalletScreen" component={WalletScreen} />
      <ProfileStackNav.Screen name="ReferAndEarnScreen" component={ReferAndEarnScreen} />
      <ProfileStackNav.Screen name="AccountSettingsScreen" component={AccountSettingsScreen} />
      <ProfileStackNav.Screen name="NotificationsScreen" component={NotificationsScreen} />
      <ProfileStackNav.Screen name="FavoritesScreen" component={FavoritesScreen} />
      <ProfileStackNav.Screen name="AppSettingsScreen" component={AppSettingsScreen} />
      <ProfileStackNav.Screen name="OffersScreen" component={OffersScreen} />
      <ProfileStackNav.Screen name="LanguageScreen" component={LanguageScreen} />
    </ProfileStackNav.Navigator>
  );
}

function CartStack() {
  return (
    <CartStackNav.Navigator screenOptions={{ headerShown: false }}>
      <CartStackNav.Screen name="CartScreen" component={CartScreen} />
      <CartStackNav.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <CartStackNav.Screen name="OrderSuccessScreen" component={OrderSuccessScreen} />
      <CartStackNav.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <CartStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
      <CartStackNav.Screen name="AddAddressScreen" component={AddAddressScreen} />
    </CartStackNav.Navigator>
  );
}

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
  const { cart, lastItemAddedTimestamp } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('HomeTab');
  const [currentRouteName, setCurrentRouteName] = useState('');
  const [isMinimizedForSession, setIsMinimizedForSession] = useState(false);
  const lastAddRef = useRef(lastItemAddedTimestamp);

  // Cart popup bar should only come after welcome screen is completed
  const willShowWelcome = !getHasShownWelcomeSession();
  const [isWelcomeActive, setIsWelcomeActive] = useState(willShowWelcome);

  const cartItemCount = cart?.items?.length || 0;

  // Re-open/un-minimize cart bar when user adds an item
  useEffect(() => {
    if (lastItemAddedTimestamp > 0 && lastItemAddedTimestamp !== lastAddRef.current) {
      lastAddRef.current = lastItemAddedTimestamp;
      setIsMinimizedForSession(false);
    }
  }, [lastItemAddedTimestamp]);

  // Pre-warm both homeDataCache and ordersCache when user is present or on component mount
  useEffect(() => {
    loadHomeData().catch(() => {});
    loadCachedOrders().catch(() => {});
  }, [user]);

  // Optimize Android bottom padding
  const bottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 4 : 0,
    Platform.OS === 'android' ? (insets.bottom > 0 ? insets.bottom : 10) : 12
  );
  const totalBarHeight = 58 + bottomPadding;
  const { colors, isDark } = useTheme();

  const dynamicTabBarStyle = [
    styles.tabBar, 
    { 
      height: totalBarHeight, 
      paddingBottom: bottomPadding,
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WelcomeScreen 
        onStart={() => setIsWelcomeActive(true)}
        onFinish={() => setIsWelcomeActive(false)}
      />

      <Tab.Navigator
        detachInactiveScreens={true}
        screenListeners={{
          state: (e: any) => {
            const route = e.data?.state?.routes?.[e.data?.state?.index];
            if (route?.name && route.name !== currentTab) {
              setCurrentTab(route.name);
              triggerHaptic('selection');
            }
            if (route) {
              const deepName = getFocusedRouteNameFromRoute(route) ?? route.name;
              setCurrentRouteName((prev) => (prev !== deepName ? deepName : prev));
            }
          },
        }}
        screenOptions={{
          headerShown: false,
          freezeOnBlur: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarItemStyle: {
            paddingBottom: 4,
            paddingTop: 4,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '800',
            marginTop: 1,
          },
        }}
      >
        <Tab.Screen 
          name="HomeTab" 
          component={HomeStack}
          options={({ route }) => ({
            tabBarLabel: t('home'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size || 22} />
            ),
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen 
          name="CategoriesTab" 
          component={CategoriesStack}
          options={({ route }) => ({
            tabBarLabel: t('categories'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "grid" : "grid-outline"} color={color} size={size || 22} />
            ),
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen 
          name="OrdersTab" 
          component={OrdersStack}
          options={({ route }) => ({
            tabBarLabel: t('orders'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "receipt" : "receipt-outline"} color={color} size={size || 22} />
            ),
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileStack}
          options={({ route }) => ({
            tabBarLabel: t('profile'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} color={color} size={size || 22} />
            ),
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen 
          name="CartTab" 
          component={CartStack}
          options={({ route }) => ({
            tabBarLabel: t('cart'),
            tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: '#059669',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '900',
              minWidth: 18,
              paddingHorizontal: 4,
              height: 18,
              lineHeight: 18,
              borderRadius: 9,
              textAlign: 'center',
              textAlignVertical: 'center',
            },
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "cart" : "cart-outline"} color={color} size={size || 22} />
            ),
            tabBarStyle: shouldHideTabBar(route) 
              ? { display: 'none' } 
              : dynamicTabBarStyle,
          })}
        />
      </Tab.Navigator>

      {/* Floating Mini-Cart Bar: persistently visible unless user explicitly closes it, and NEVER on CartTab */}
      {!isMinimizedForSession && !isWelcomeActive && currentTab !== 'CartTab' && cartItemCount > 0 && (
        <FloatingCartBar 
          bottomOffset={totalBarHeight + 10}
          onPress={() => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('Main', {
                screen: 'CartTab',
                params: { screen: 'CartScreen' },
              });
            } else {
              navigation.navigate('Main', {
                screen: 'CartTab',
                params: { screen: 'CartScreen' },
              });
            }
          }}
          onClose={() => setIsMinimizedForSession(true)}
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

