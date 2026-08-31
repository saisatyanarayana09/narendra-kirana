import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../api/client';
import { STORAGE_KEYS } from '../constants/config';
import { getItem, saveItem, deleteItem } from '../utils/storage';

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
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
    // Check for stored token/user on app start
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        // Verify token is still valid or refresh it seamlessly
        try {
          const res = await apiClient.get('/auth/profile/');
          setUser(res.data);
          await saveItem(STORAGE_KEYS.USER, JSON.stringify(res.data));
        } catch (e) {
          // Handled by interceptor, but if it fully fails, interceptor clears tokens
          // So we should double check if token is still there
          const token = await getItem(STORAGE_KEYS.TOKEN);
          if (!token) {
            setUser(null);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load user', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const response = await apiClient.post('/auth/login/', credentials);
    const { access, refresh, user: userData } = response.data;
    
    await saveItem(STORAGE_KEYS.TOKEN, access);
    await saveItem(STORAGE_KEYS.REFRESH, refresh);
    await saveItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    
    setUser(userData);
  };

  const logout = async () => {
    await deleteItem(STORAGE_KEYS.TOKEN);
    await deleteItem(STORAGE_KEYS.REFRESH);
    await deleteItem(STORAGE_KEYS.USER);
    setUser(null);
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
