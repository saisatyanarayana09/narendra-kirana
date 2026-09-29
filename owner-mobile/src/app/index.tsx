import React from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading || (Platform.OS === 'web' && typeof window === 'undefined')) {
    return null;
  }

  return <Redirect href={token ? '/(tabs)' : '/(auth)/login'} />;
}
