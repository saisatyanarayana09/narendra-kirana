import React, { Component, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { OfflineBanner } from './src/components/OfflineBanner';
import { ErrorBoundary } from './src/components/ErrorBoundary';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { checkAndDownloadOtaUpdateSilently } from './src/services/otaService';

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

  React.useEffect(() => {
    // Non-blocking silent background OTA check
    const timer = setTimeout(() => {
      checkAndDownloadOtaUpdateSilently().catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <OfflineBanner />
      <RootNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

function MainApp() {
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
