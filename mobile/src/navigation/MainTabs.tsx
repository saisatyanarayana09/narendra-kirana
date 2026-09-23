import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  useNavigation,
  getFocusedRouteNameFromRoute,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useState, useEffect, useRef } from "react";
import { View, Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorBoundary } from "../components/ErrorBoundary";
import { FloatingCartBar } from "../components/FloatingCartBar";
import { WelcomeScreen } from "../components/WelcomeScreen";
import { navigationRef } from "./navigationRef";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { CartScreen } from "../screens/cart/CartScreen";
import { CheckoutScreen } from "../screens/cart/CheckoutScreen";
import { CategoriesScreen } from "../screens/categories/CategoriesScreen";
import { FavoritesScreen } from "../screens/favorites/FavoritesScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { InvoiceScreen } from "../screens/orders/InvoiceScreen";
import { OrderHistoryScreen } from "../screens/orders/OrderHistoryScreen";
import { OrderSuccessScreen } from "../screens/orders/OrderSuccessScreen";
import { OrderTrackingScreen } from "../screens/orders/OrderTrackingScreen";
import { ProductDetailScreen } from "../screens/products/ProductDetailScreen";
import { ProductListScreen } from "../screens/products/ProductListScreen";
import { SearchScreen } from "../screens/products/SearchScreen";
import { AccountSettingsScreen } from "../screens/profile/AccountSettingsScreen";
import { AddAddressScreen } from "../screens/profile/AddAddressScreen";
import { AddressesScreen } from "../screens/profile/AddressesScreen";
import { AppSettingsScreen } from "../screens/profile/AppSettingsScreen";
import { LanguageScreen } from "../screens/profile/LanguageScreen";
import { NotificationsScreen } from "../screens/profile/NotificationsScreen";
import { OffersScreen } from "../screens/profile/OffersScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { ReferAndEarnScreen } from "../screens/profile/ReferAndEarnScreen";
import { WalletScreen } from "../screens/profile/WalletScreen";
import { loadHomeData } from "../services/homeDataCache";
import { loadCachedOrders } from "../services/ordersCache";
import { triggerHaptic } from "../utils/haptics";
import { getHasShownWelcomeSession } from "../utils/welcomeSession";

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
    <ErrorBoundary>
      <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
        <HomeStackNav.Screen name="HomeScreen" component={HomeScreen} />
        <HomeStackNav.Screen
          name="ProductDetailScreen"
          component={ProductDetailScreen}
        />
        <HomeStackNav.Screen name="SearchScreen" component={SearchScreen} />
        <HomeStackNav.Screen
          name="ProductListScreen"
          component={ProductListScreen}
        />
        <HomeStackNav.Screen
          name="OrderTrackingScreen"
          component={OrderTrackingScreen}
        />
        <HomeStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
      </HomeStackNav.Navigator>
    </ErrorBoundary>
  );
}

function CategoriesStack() {
  return (
    <ErrorBoundary>
      <CategoriesStackNav.Navigator screenOptions={{ headerShown: false }}>
        <CategoriesStackNav.Screen
          name="CategoriesScreen"
          component={CategoriesScreen}
        />
        <CategoriesStackNav.Screen
          name="ProductListScreen"
          component={ProductListScreen}
        />
        <CategoriesStackNav.Screen
          name="ProductDetailScreen"
          component={ProductDetailScreen}
        />
      </CategoriesStackNav.Navigator>
    </ErrorBoundary>
  );
}

function OrdersStack() {
  return (
    <ErrorBoundary>
      <OrdersStackNav.Navigator screenOptions={{ headerShown: false }}>
        <OrdersStackNav.Screen
          name="OrderHistoryScreen"
          component={OrderHistoryScreen}
        />
        <OrdersStackNav.Screen
          name="OrderTrackingScreen"
          component={OrderTrackingScreen}
        />
        <OrdersStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
      </OrdersStackNav.Navigator>
    </ErrorBoundary>
  );
}

function ProfileStack() {
  return (
    <ErrorBoundary>
      <ProfileStackNav.Navigator screenOptions={{ headerShown: false }}>
        <ProfileStackNav.Screen
          name="ProfileScreen"
          component={ProfileScreen}
        />
        <ProfileStackNav.Screen
          name="OrderHistoryScreen"
          component={OrderHistoryScreen}
        />
        <ProfileStackNav.Screen
          name="OrderTrackingScreen"
          component={OrderTrackingScreen}
        />
        <ProfileStackNav.Screen
          name="InvoiceScreen"
          component={InvoiceScreen}
        />
        <ProfileStackNav.Screen
          name="AddressesScreen"
          component={AddressesScreen}
        />
        <ProfileStackNav.Screen
          name="AddAddressScreen"
          component={AddAddressScreen}
        />
        <ProfileStackNav.Screen name="WalletScreen" component={WalletScreen} />
        <ProfileStackNav.Screen
          name="ReferAndEarnScreen"
          component={ReferAndEarnScreen}
        />
        <ProfileStackNav.Screen
          name="AccountSettingsScreen"
          component={AccountSettingsScreen}
        />
        <ProfileStackNav.Screen
          name="NotificationsScreen"
          component={NotificationsScreen}
        />
        <ProfileStackNav.Screen
          name="FavoritesScreen"
          component={FavoritesScreen}
        />
        <ProfileStackNav.Screen
          name="ProductDetailScreen"
          component={ProductDetailScreen}
        />
        <ProfileStackNav.Screen
          name="AppSettingsScreen"
          component={AppSettingsScreen}
        />
        <ProfileStackNav.Screen name="OffersScreen" component={OffersScreen} />
        <ProfileStackNav.Screen
          name="LanguageScreen"
          component={LanguageScreen}
        />
      </ProfileStackNav.Navigator>
    </ErrorBoundary>
  );
}

function CartStack() {
  return (
    <ErrorBoundary>
      <CartStackNav.Navigator screenOptions={{ headerShown: false }}>
        <CartStackNav.Screen name="CartScreen" component={CartScreen} />
        <CartStackNav.Screen name="CheckoutScreen" component={CheckoutScreen} />
        <CartStackNav.Screen
          name="OrderSuccessScreen"
          component={OrderSuccessScreen}
        />
        <CartStackNav.Screen
          name="OrderTrackingScreen"
          component={OrderTrackingScreen}
        />
        <CartStackNav.Screen name="InvoiceScreen" component={InvoiceScreen} />
        <CartStackNav.Screen
          name="AddAddressScreen"
          component={AddAddressScreen}
        />
      </CartStackNav.Navigator>
    </ErrorBoundary>
  );
}

const shouldHideTabBar = (route: any) => {
  const routeName = getFocusedRouteNameFromRoute(route) ?? "";
  const hideOnScreens = [
    "ProductDetailScreen",
    "CheckoutScreen",
    "OrderSuccessScreen",
    "OrderTrackingScreen",
    "InvoiceScreen",
    "AddAddressScreen",
  ];
  return hideOnScreens.includes(routeName);
};

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { cart } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState("HomeTab");
  const [currentRouteName, setCurrentRouteName] = useState("");
  const [isMinimizedForSession, setIsMinimizedForSession] = useState(false);

  // Cart popup bar should only come after welcome screen is completed
  const willShowWelcome = !getHasShownWelcomeSession();
  const [isWelcomeActive, setIsWelcomeActive] = useState(willShowWelcome);

  const cartItemCount = (cart?.items || []).reduce(
    (sum: number, item: any) => sum + (item.quantity > 0 ? item.quantity : 0),
    0,
  );
  const prevCartItemCountRef = useRef(cartItemCount);

  useEffect(() => {
    // If the user adds a new item to the cart, un-minimize the floating cart bar so they see the feedback!
    if (cartItemCount > prevCartItemCountRef.current) {
      setIsMinimizedForSession(false);
    }
    prevCartItemCountRef.current = cartItemCount;
  }, [cartItemCount]);

  // Pre-warm both homeDataCache and ordersCache when user is present or on component mount
  useEffect(() => {
    loadHomeData().catch(() => {});
    loadCachedOrders().catch(() => {});
  }, [user]);

  // Keep currentRouteName synchronized with nested screen changes (e.g. ProductDetailScreen)
  useEffect(() => {
    const updateRoute = () => {
      try {
        if (navigationRef.isReady()) {
          const route = navigationRef.getCurrentRoute();
          if (route?.name) {
            setCurrentRouteName(route.name);
          }
        }
      } catch {}
    };
    updateRoute();
    const unsub = navigationRef.addListener("state", updateRoute);
    return unsub;
  }, []);

  // Optimize Android bottom padding
  const bottomPadding = Math.max(
    insets.bottom > 0 ? insets.bottom + 4 : 0,
    Platform.OS === "android" ? (insets.bottom > 0 ? insets.bottom : 10) : 12,
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
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WelcomeScreen
        onStart={() => setIsWelcomeActive(true)}
        onFinish={() => setIsWelcomeActive(false)}
      />

      <Tab.Navigator
        detachInactiveScreens
        screenListeners={{
          state: (e: any) => {
            const route = e.data?.state?.routes?.[e.data?.state?.index];
            if (route?.name && route.name !== currentTab) {
              setCurrentTab(route.name);
              triggerHaptic("selection");
            }
            if (route) {
              const deepName =
                getFocusedRouteNameFromRoute(route) ?? route.name;
              setCurrentRouteName((prev) =>
                prev !== deepName ? deepName : prev,
              );
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
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            marginTop: 1,
            letterSpacing: -0.2,
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={({ route }) => ({
            tabBarLabel: t("home"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                color={color}
                size={size || 22}
              />
            ),
            tabBarStyle: shouldHideTabBar(route)
              ? { display: "none" }
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen
          name="CategoriesTab"
          component={CategoriesStack}
          options={({ route }) => ({
            tabBarLabel: t("categories"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
                color={color}
                size={size || 22}
              />
            ),
            tabBarStyle: shouldHideTabBar(route)
              ? { display: "none" }
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen
          name="OrdersTab"
          component={OrdersStack}
          options={({ route }) => ({
            tabBarLabel: t("orders"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "receipt" : "receipt-outline"}
                color={color}
                size={size || 22}
              />
            ),
            tabBarStyle: shouldHideTabBar(route)
              ? { display: "none" }
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStack}
          options={({ route }) => ({
            tabBarLabel: t("profile"),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                color={color}
                size={size || 22}
              />
            ),
            tabBarStyle: shouldHideTabBar(route)
              ? { display: "none" }
              : dynamicTabBarStyle,
          })}
        />
        <Tab.Screen
          name="CartTab"
          component={CartStack}
          options={({ route }) => ({
            tabBarLabel: t("cart"),
            tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
            tabBarBadgeStyle: {
              backgroundColor: "#059669",
              color: "#FFFFFF",
              fontSize: 10,
              fontWeight: "900",
              minWidth: 18,
              paddingHorizontal: 4,
              height: 18,
              lineHeight: 18,
              borderRadius: 9,
              textAlign: "center",
              textAlignVertical: "center",
            },
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "cart" : "cart-outline"}
                color={color}
                size={size || 22}
              />
            ),
            tabBarStyle: shouldHideTabBar(route)
              ? { display: "none" }
              : dynamicTabBarStyle,
          })}
        />
      </Tab.Navigator>

      {/* Floating Mini-Cart Bar: persistently visible unless user explicitly closes it, and NEVER on CartTab or ProfileTab */}
      {!isMinimizedForSession &&
        !isWelcomeActive &&
        currentTab !== "CartTab" &&
        currentTab !== "ProfileTab" &&
        cartItemCount > 0 && (
          <FloatingCartBar
            bottomOffset={totalBarHeight + 6}
            onPress={() => {
              navigation.navigate("CartTab", { screen: "CartScreen" });
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
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    elevation: 8,
    boxShadow: "0px -2px 6px rgba(0, 0, 0, 0.06)",
    paddingTop: 8,
  },
});
