import React, { Component, ReactNode } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
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

class TopLevelErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  state: { hasError: boolean; error: any } = { hasError: false, error: null };
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any) {
    console.error('[TopLevelErrorBoundary] Uncaught app error:', error);
  }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || String(this.state.error || 'Unknown error occurred.');
      return (
        <View style={{ flex: 1, backgroundColor: '#090D16', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 20, fontWeight: '900', marginBottom: 8 }}>App Error</Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            {msg}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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

function MainApp() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
  });

  const [fontTimeout, setFontTimeout] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setFontTimeout(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError && !fontTimeout) {
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

export default function App() {
  return (
    <TopLevelErrorBoundary>
      <MainApp />
    </TopLevelErrorBoundary>
  );
}
