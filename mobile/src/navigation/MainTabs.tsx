import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { theme } from '../constants/theme';

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
  FavoritesTab: undefined;
  CartTab: undefined;
  ProfileTab: undefined;
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

function CartStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CartScreen" component={CartScreen} />
      <Stack.Screen name="CheckoutScreen" component={CheckoutScreen} />
      <Stack.Screen name="OrderSuccessScreen" component={OrderSuccessScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="AddAddressScreen" component={AddAddressScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <Stack.Screen name="OrderTrackingScreen" component={OrderTrackingScreen} />
      <Stack.Screen name="AddressesScreen" component={AddressesScreen} />
      <Stack.Screen name="AddAddressScreen" component={AddAddressScreen} />
      <Stack.Screen name="WalletScreen" component={WalletScreen} />
      <Stack.Screen name="ReferAndEarnScreen" component={ReferAndEarnScreen} />
      <Stack.Screen name="AccountSettingsScreen" component={AccountSettingsScreen} />
      <Stack.Screen name="NotificationsScreen" component={NotificationsScreen} />
    </Stack.Navigator>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          borderTopColor: theme.colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="CategoriesTab" 
        component={CategoriesStack}
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => <Feather name="heart" color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="CartTab" 
        component={CartStack}
        options={{
          tabBarLabel: 'Cart',
          tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
