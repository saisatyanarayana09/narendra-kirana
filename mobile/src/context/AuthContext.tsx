import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { apiClient } from '../api/client';
import { STORAGE_KEYS } from '../constants/config';
import { getItem, saveItem, deleteItem } from '../utils/storage';
import { resetWelcomeSession } from '../utils/welcomeSession';

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
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);

  const clearPendingRedirect = () => setPendingRedirect(null);

  useEffect(() => {
    loadStoredUser();

    const sub = DeviceEventEmitter.addListener('AUTH_FAILED', () => {
      setUser(null);
    });

    return () => sub.remove();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load user', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (data: any) => {
    try {
      const response = await apiClient.post('/auth/login/', data);
      const { access, refresh, user: loggedUser } = response.data;
      
      await saveItem(STORAGE_KEYS.TOKEN, access);
      await saveItem(STORAGE_KEYS.REFRESH, refresh);
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(loggedUser));
      
      resetWelcomeSession();
      setUser(loggedUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await getItem(STORAGE_KEYS.REFRESH);
      if (refreshToken) {
        await apiClient.post('/auth/logout/', { refresh: refreshToken }).catch(() => {});
      }
      await deleteItem(STORAGE_KEYS.TOKEN);
      await deleteItem(STORAGE_KEYS.REFRESH);
      await deleteItem(STORAGE_KEYS.USER);
      resetWelcomeSession();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      await saveItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update user locally:', error);
    }
  };

  const refreshUser = async () => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        pendingRedirect,
        setPendingRedirect,
        clearPendingRedirect,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
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
