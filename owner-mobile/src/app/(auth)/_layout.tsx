import { Stack } from 'expo-router';
export { ErrorBoundary } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" options={{ title: 'Owner Login', headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password', headerShown: false }} />
    </Stack>
  );
}
