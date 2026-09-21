import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { apiClient } from '../api/client';
import { STORAGE_KEYS } from '../constants/config';
import { getItem, getItemSync, saveItem, deleteItem } from '../utils/storage';
import { resetWelcomeSession } from '../utils/welcomeSession';
import { registerForPushNotificationsAsync, unregisterPushNotificationsAsync } from '../services/notificationService';
import { favoritesService } from '../services/favoritesService';
import { clearCachedOrders } from '../services/ordersCache';
import { clearUserProfileCache } from '../services/profileCache';

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  customer_profile?: {
    dob?: string;
    referral_code?: string;
    delete_requested?: boolean;
    [key: string]: any;
  };
  referral_code?: string;
  [key: string]: any;
};

export type PendingRedirect = {
  screen: string;
  tab?: string;
  params?: any;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  pendingRedirect: PendingRedirect | null;
  setPendingRedirect: (redirect: PendingRedirect | null) => void;
  clearPendingRedirect: () => void;
  login: (data: any) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Try to read user from memoryStore synchronously (populated by preloadKeys)
function tryGetSyncUser(): User | null {
  try {
    const raw = getItemSync(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // If preloadKeys has already populated memoryStore, we get user instantly
  // and skip the isLoading=true state entirely
  const syncUser = tryGetSyncUser();
  const [user, setUser] = useState<User | null>(syncUser);
  const [isLoading, setIsLoading] = useState(!syncUser); // Only show loading if sync init failed
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);

  const clearPendingRedirect = useCallback(() => setPendingRedirect(null), []);

  const loadStoredUser = useCallback(async () => {
    try {
      const storedUser = await getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        registerForPushNotificationsAsync().catch(() => {});
      }
    } catch (error) {
      console.error('Failed to load user', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If we already initialized user synchronously, still run the async path
    // to ensure push notifications are registered and storage is confirmed
    if (syncUser) {
      registerForPushNotificationsAsync().catch(() => {});
    }
    loadStoredUser();

    const sub = DeviceEventEmitter.addListener('AUTH_FAILED', () => {
      setUser(null);
    });

    return () => sub.remove();
  }, [loadStoredUser]);

  const login = useCallback(async (data: any) => {
    try {
      const response = await apiClient.post('/auth/login/', data);
      
      if (!response.data) throw new Error('Invalid response from server');
      
      const { access, refresh, user: loggedUser } = response.data;
      
      await saveItem(STORAGE_KEYS.TOKEN, access);
      await saveItem(STORAGE_KEYS.REFRESH, refresh);
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser));
      
      resetWelcomeSession();
      setUser(loggedUser);
      registerForPushNotificationsAsync().catch(() => {});
    } catch (error) {
      throw error;
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const response = await apiClient.post('/auth/google/customer/', {
        credential: idToken,
        token_type: 'id_token'
      });
      
      const { access, refresh, user: userData } = response.data;
      
      await saveItem(STORAGE_KEYS.TOKEN, access);
      await saveItem(STORAGE_KEYS.REFRESH, refresh);
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      
      setUser(userData);
      registerForPushNotificationsAsync().catch(() => {});
    } catch (error: any) {
      console.error('Google Login error:', error?.response?.data || error.message);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await unregisterPushNotificationsAsync().catch(() => {});
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH);
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {});
      }
      await deleteItem(STORAGE_KEYS.TOKEN);
      await deleteItem(STORAGE_KEYS.REFRESH);
      await deleteItem(STORAGE_KEYS.USER);
      resetWelcomeSession();
      favoritesService.clear();
      clearCachedOrders().catch(() => {});
      clearUserProfileCache().catch(() => {});
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, []);

  const updateUser = useCallback(async (updatedUser: User) => {
    try {
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user locally:', error);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/profile/');
      if (response.data) {
        await saveItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
        setUser(response.data);
      }
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error('Failed to refresh user profile:', error);
      }
    }
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    pendingRedirect,
    setPendingRedirect,
    clearPendingRedirect,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    refreshUser,
  }), [
    user,
    isLoading,
    pendingRedirect,
    clearPendingRedirect,
    login,
    loginWithGoogle,
    logout,
    updateUser,
    refreshUser,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
