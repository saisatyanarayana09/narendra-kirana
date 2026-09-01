import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [Linking.createURL('/'), 'smartkirana://', 'https://narendra-kirana.vercel.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Signup: 'signup',
        }
      },
      Main: {
        screens: {
          HomeTab: {
            screens: {
              ProductDetailScreen: 'product/:productId',
            }
          },
          OrdersTab: {
            screens: {
              OrderTrackingScreen: 'order/:orderId',
            }
          },
          ProfileTab: {
            screens: {
              OrderTrackingScreen: 'order/:orderId',
            }
          }
        }
      }
    }
  }
};

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <NavigationContainer linking={linking as any}>
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
