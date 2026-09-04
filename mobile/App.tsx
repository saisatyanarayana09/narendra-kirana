import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { 
  useFonts,
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black
} from '@expo-google-fonts/nunito';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';

function ThemedAppContent() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <OfflineBanner />
      <RootNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    'Nunito': Nunito_400Regular,
    'Nunito-Regular': Nunito_400Regular,
    'Nunito-Medium': Nunito_500Medium,
    'Nunito-SemiBold': Nunito_600SemiBold,
    'Nunito-Bold': Nunito_700Bold,
    'Nunito-ExtraBold': Nunito_800ExtraBold,
    'Nunito-Black': Nunito_900Black,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <CartProvider>
                <ThemedAppContent />
              </CartProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
