import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();

const SECURE_KEYS = new Set(['access_token', 'refresh_token', 'auth_token', 'user_token']);

function isSecureKey(key: string): boolean {
  return SECURE_KEYS.has(key) || key.toLowerCase().includes('token') || key.toLowerCase().includes('refresh');
}

function sanitizeKey(key: string): string {
  return (key || 'key').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function saveItem(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else if (isSecureKey(key)) {
      try {
        await SecureStore.setItemAsync(sanitizeKey(key), value);
      } catch (secErr) {
        // Fallback to AsyncStorage if SecureStore/Keystore fails
        await AsyncStorage.setItem(key, value);
      }
    } else {
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('[Storage] Error saving item:', key, error);
  }
}

export function getItemSync(key: string): string | null {
  return memoryStore.get(key) || null;
}

export async function getItem(key: string): Promise<string | null> {
  const inMem = memoryStore.get(key);
  if (inMem !== undefined) {
    return inMem;
  }

  try {
    if (Platform.OS === 'web') {
      const val = localStorage.getItem(key);
      if (val !== null) memoryStore.set(key, val);
      return val;
    } else if (isSecureKey(key)) {
      try {
        const val = await SecureStore.getItemAsync(sanitizeKey(key));
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      } catch {
        // Fallback to AsyncStorage if SecureStore fails
      }
      try {
        const asyncVal = await AsyncStorage.getItem(key);
        if (asyncVal !== null && asyncVal !== undefined) {
          memoryStore.set(key, asyncVal);
          return asyncVal;
        }
      } catch {
        // Fallback to memory
      }
      return null;
    } else {
      try {
        const asyncVal = await AsyncStorage.getItem(key);
        if (asyncVal !== null && asyncVal !== undefined) {
          memoryStore.set(key, asyncVal);
          return asyncVal;
        }
      } catch {}
      // Fallback check legacy SecureStore in case key was saved there before
      try {
        const val = await SecureStore.getItemAsync(sanitizeKey(key));
        if (val !== null && val !== undefined) {
          memoryStore.set(key, val);
          return val;
        }
      } catch {}
      return null;
    }
  } catch (error) {
    console.warn('[Storage] Error getting item:', key, error);
    return null;
  }
}

export async function deleteItem(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      if (isSecureKey(key)) {
        try {
          await SecureStore.deleteItemAsync(sanitizeKey(key));
        } catch {
          // Ignore secure store delete failure
        }
      }
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        // Ignore async storage delete failure
      }
    }
  } catch (error) {
    console.warn('[Storage] Error deleting item:', key, error);
  }
}

/**
 * Batch-preload multiple keys from SecureStore/AsyncStorage into memoryStore
 * in parallel. After this resolves, getItemSync() returns values instantly.
 */
let preloadPromise: Promise<void> | null = null;

export function preloadKeys(keys: string[]): Promise<void> {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    if (Platform.OS === 'web') return;

    await Promise.allSettled(
      keys.map(async (key) => {
        // Skip if already in memory
        if (memoryStore.has(key)) return;
        if (isSecureKey(key)) {
          try {
            const val = await SecureStore.getItemAsync(sanitizeKey(key));
            if (val !== null && val !== undefined) {
              memoryStore.set(key, val);
              return;
            }
          } catch {}
        }
        try {
          const asyncVal = await AsyncStorage.getItem(key);
          if (asyncVal !== null && asyncVal !== undefined) {
            memoryStore.set(key, asyncVal);
          }
        } catch {}
      })
    );
  })();

  return preloadPromise;
}

// Auto-preload critical keys at module init time so context providers
// can access them synchronously as early as possible
preloadKeys([
  'smart-kirana-mobile-token',
  'smart-kirana-mobile-refresh',
  'smart-kirana-mobile-user',
  'sk_theme_mode',
  'sk_language',
]);


