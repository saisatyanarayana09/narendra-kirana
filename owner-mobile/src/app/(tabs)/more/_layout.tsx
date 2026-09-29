import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="categories" />
      <Stack.Screen name="showcase" />
      <Stack.Screen name="offers" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="broadcast" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="delivery" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="map" />
      <Stack.Screen name="advanced-settings" />
    </Stack>
  );
}
