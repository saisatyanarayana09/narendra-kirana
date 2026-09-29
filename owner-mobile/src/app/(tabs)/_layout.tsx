import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1e293b',
        },
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#1e293b',
          borderTopColor: '#334155',
        },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#94a3b8',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => <Ionicons name="receipt" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color }) => <Ionicons name="cube" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <Ionicons name="menu" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
