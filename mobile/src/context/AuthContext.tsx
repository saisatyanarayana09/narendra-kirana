import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { apiClient } from '../api/client';
import { STORAGE_KEYS } from '../constants/config';
import { getItem, saveItem, deleteItem } from '../utils/storage';

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

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      
      setUser(loggedUser);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await deleteItem(STORAGE_KEYS.TOKEN);
      await deleteItem(STORAGE_KEYS.REFRESH);
      await deleteItem(STORAGE_KEYS.USER);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
