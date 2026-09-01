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
    </Stack.Navigator>
  );
}

import { useCart } from '../context/CartContext';

export function MainTabs() {
  const { cart } = useCart();
  const cartItemCount = cart?.items?.length || 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669', // Emerald-600 matching web
        tabBarInactiveTintColor: '#64748B', // Slate-500 matching web
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderTopColor: '#E2E8F0',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={20} />,
        }}
      />
      <Tab.Screen 
        name="CategoriesTab" 
        component={CategoriesStack}
        options={{
          tabBarLabel: 'Categories',
          tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={20} />,
        }}
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => <Feather name="heart" color={color} size={20} />,
        }}
      />
      <Tab.Screen 
        name="CartTab" 
        component={CartStack}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#0F172A', // slate-900 matching web
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '900',
          },
          tabBarIcon: ({ color, size }) => <Feather name="shopping-cart" color={color} size={20} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" color={color} size={20} />,
        }}
      />
    </Tab.Navigator>
  );
}
