import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem as getSecureItem, saveItem as saveSecureItem, deleteItem as deleteSecureItem } from './storage';

// In-memory fallback map for environments where native storage module is null
const memoryStorage = new Map<string, string>();
let asyncStorageAvailable: boolean | null = null;

async function isAsyncStorageWorking(): Promise<boolean> {
  if (asyncStorageAvailable !== null) {
    return asyncStorageAvailable;
  }
  try {
    if (!AsyncStorage || typeof AsyncStorage.getItem !== 'function') {
      asyncStorageAvailable = false;
      return false;
    }
    await AsyncStorage.getItem('storage_test');
    asyncStorageAvailable = true;
    return true;
  } catch {
    asyncStorageAvailable = false;
    return false;
  }
}

export async function getGuestStorageItem(key: string): Promise<string | null> {
  // 1. Try AsyncStorage if available
  const working = await isAsyncStorageWorking();
  if (working) {
    try {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) return val;
    } catch {
      asyncStorageAvailable = false;
    }
  }

  // 2. Try SecureStore / localStorage fallback
  try {
    const secureVal = await getSecureItem(key);
    if (secureVal !== null && secureVal !== undefined) {
      return secureVal;
    }
  } catch {
    // Ignore fallback errors
  }

  // 3. In-memory fallback
  return memoryStorage.get(key) || null;
}

export async function setGuestStorageItem(key: string, value: string): Promise<void> {
  memoryStorage.set(key, value);

  // 1. Try AsyncStorage
  const working = await isAsyncStorageWorking();
  if (working) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch {
      asyncStorageAvailable = false;
    }
  }

  // 2. Fallback to SecureStore / localStorage
  try {
    await saveSecureItem(key, value);
  } catch {
    // In-memory already updated
  }
}

export async function removeGuestStorageItem(key: string): Promise<void> {
  memoryStorage.delete(key);

  const working = await isAsyncStorageWorking();
  if (working) {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      asyncStorageAvailable = false;
    }
  }

  try {
    await deleteSecureItem(key);
  } catch {
    // In-memory already cleared
  }
}
