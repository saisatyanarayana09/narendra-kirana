import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ 
      headerStyle: { backgroundColor: '#1e293b' },
      headerTintColor: '#fff',
    }}>
      <Stack.Screen name="index" options={{ title: 'Menu', headerShown: false }} />
      <Stack.Screen name="scanner" options={{ title: 'QR Scanner' }} />
      <Stack.Screen name="settings" options={{ title: 'Store Settings' }} />
      <Stack.Screen name="map" options={{ title: 'Delivery Area' }} />
      <Stack.Screen name="broadcast" options={{ title: 'Push Broadcast' }} />
      <Stack.Screen name="reports" options={{ title: 'Sales Reports' }} />
      <Stack.Screen name="delivery" options={{ title: 'Delivery Partners' }} />
    </Stack>
  );
}
