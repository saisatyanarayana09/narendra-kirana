import React, { Component, ReactNode } from 'react';
import { useFonts } from 'expo-font';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import { View, Text, Platform, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress third-party strict deprecation warnings from react-native-web / react-navigation
LogBox.ignoreLogs([
  'TouchableOpacity is deprecated',
  'props.pointerEvents is deprecated',
]);

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
  // ALL hooks must be called unconditionally before any early return (Rules of Hooks)
  const [fontsLoaded, fontError] = useFonts({
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    ...Feather.font,
    ...Ionicons.font,
    ...MaterialIcons.font,
  });

  const [isUpdatingOnStartup, setIsUpdatingOnStartup] = React.useState(false);
  const [otaStatusText, setOtaStatusText] = React.useState('Updating...');

  React.useEffect(() => {
    // Only show launch update screen when an update is ACTUALLY available and downloading/installing
    const unsubscribe = subscribeOtaState((state) => {
      if (state.isUpdateAvailable && (state.isDownloading || state.isUpdatePending)) {
        setIsUpdatingOnStartup(true);
        setOtaStatusText('Updating...');
      } else if (!state.isDownloading && !state.isUpdatePending) {
        setIsUpdatingOnStartup(false);
      }
    });

    // Run background startup OTA check without blocking screen
    runStartupOtaFlow().catch(() => {});

    return () => unsubscribe();
  }, []);

  // Early returns AFTER all hooks have been called
  // On web, typography.ts handles fonts via direct CSS injection, so we bypass Expo's FontLoader to prevent fontfaceobserver 12000ms timeout crashes
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') {
    return <View style={{ flex: 1, backgroundColor: '#090D16' }} />;
  }

  if (isUpdatingOnStartup) {
    return (
      <OtaLaunchScreen 
        title="Updating"
        subtitle="Please wait while the update is applied..."
        statusMessage={otaStatusText}
        onSkip={() => setIsUpdatingOnStartup(false)} 
      />
    );
  }

  const onLayoutRootView = React.useCallback(async () => {
    if (fontsLoaded || fontError || Platform.OS === 'web') {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
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
    </View>
  );
}

export default function App() {
  return (
    <TopLevelErrorBoundary>
      <MainApp />
    </TopLevelErrorBoundary>
  );
}
