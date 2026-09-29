import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import api, { TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/api';
import { safeStorage } from '../utils/storage';

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  login: (newToken: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  const logout = useCallback(async () => {
    await safeStorage.removeItem(TOKEN_KEY);
    await safeStorage.removeItem(REFRESH_TOKEN_KEY);
    api.clearCache();
    setToken(null);
  }, []);

  useEffect(() => {
    api.setOnUnauthorized(() => {
      setToken(null);
    });
    return () => {
      api.setOnUnauthorized(null);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadToken = async () => {
      try {
        const storedToken = await safeStorage.getItem(TOKEN_KEY);
        // Basic structural sanity check for JWT (3 segments)
        if (storedToken && typeof storedToken === 'string' && storedToken.split('.').length === 3) {
          if (isMounted) setToken(storedToken);
        } else if (storedToken) {
          await safeStorage.removeItem(TOKEN_KEY);
          await safeStorage.removeItem(REFRESH_TOKEN_KEY);
        }
      } catch {
        // Ignore storage read errors
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadToken();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [token, segments, isLoading, router]);

  const login = useCallback(async (newToken: string, refreshToken?: string) => {
    if (!newToken || typeof newToken !== 'string') return;
    await safeStorage.setItem(TOKEN_KEY, newToken);
    if (refreshToken && typeof refreshToken === 'string') {
      await safeStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
    api.clearCache();
    setToken(newToken);
  }, []);

  const contextValue = React.useMemo(
    () => ({
      token,
      isLoading,
      login,
      logout,
    }),
    [token, isLoading, login, logout]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
