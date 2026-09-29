import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack screenOptions={{ 
      headerStyle: { backgroundColor: '#1e293b' },
      headerTintColor: '#fff',
    }}>
      <Stack.Screen name="index" options={{ title: 'Orders List', headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Details' }} />
    </Stack>
  );
}
