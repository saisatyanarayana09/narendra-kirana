import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// In-memory fallback in case AsyncStorage or Web localStorage throws DOMException (e.g. SecurityError / QuotaExceededError) or AsyncStorageError
const memoryFallback = new Map<string, string>();

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key) ?? memoryFallback.get(key) ?? null;
      }
      const value = await AsyncStorage.getItem(key);
      return value ?? memoryFallback.get(key) ?? null;
    } catch {
      return memoryFallback.get(key) ?? null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const safeValue = String(value ?? '');
    memoryFallback.set(key, safeValue);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, safeValue);
        return;
      }
      await AsyncStorage.setItem(key, safeValue);
    } catch {
      // Fallback already saved in memoryFallback
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryFallback.delete(key);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore storage removal errors
    }
  },

  async clearAll(): Promise<void> {
    memoryFallback.clear();
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
        return;
      }
      await AsyncStorage.clear();
    } catch {
      // Ignore cleanup errors
    }
  },
};
