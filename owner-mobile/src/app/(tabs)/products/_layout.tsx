import { Stack } from 'expo-router';

export default function ProductsLayout() {
  return (
    <Stack screenOptions={{ 
      headerStyle: { backgroundColor: '#1e293b' },
      headerTintColor: '#fff',
    }}>
      <Stack.Screen name="index" options={{ title: 'Products List', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Add Product' }} />
    </Stack>
  );
}
