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
import { OtaLaunchScreen } from './src/components/OtaLaunchScreen';
import { OtaUpdateBanner } from './src/components/OtaUpdateBanner';
import { runStartupOtaFlow, subscribeOtaState } from './src/services/otaService';
import { getNotifications } from './src/services/notificationService';

// Initialize global notification handler outside of React component lifecycle
// This ensures notifications are processed even when app is in background/killed state
getNotifications();

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
      <OtaUpdateBanner />
      <RootNavigator />
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

function MainApp() {
  const [isUpdatingOnStartup, setIsUpdatingOnStartup] = React.useState(false);
  const [otaStatusText, setOtaStatusText] = React.useState('Checking for updates...');

  React.useEffect(() => {
    // 1. Listen for startup OTA downloading and pending reload states
    const unsubscribe = subscribeOtaState((state) => {
      if (state.isUpdateAvailable && (state.isDownloading || state.isUpdatePending)) {
        setIsUpdatingOnStartup(true);
        if (state.isUpdatePending) {
          setOtaStatusText('Update installed! Restarting app...');
        } else if (state.isDownloading) {
          setOtaStatusText('Downloading latest improvements & offers...');
        }
      } else if (!state.isDownloading && !state.isUpdatePending) {
        setIsUpdatingOnStartup(false);
      }
    });

    // 2. Run startup OTA check (max 3500ms race)
    runStartupOtaFlow(3500).catch(() => {});

    return () => unsubscribe();
  }, []);

  if (isUpdatingOnStartup) {
    return (
      <OtaLaunchScreen 
        statusMessage={otaStatusText}
        onSkip={() => setIsUpdatingOnStartup(false)} 
      />
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
