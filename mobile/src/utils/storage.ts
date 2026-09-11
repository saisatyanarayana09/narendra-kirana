import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const memoryStore = new Map<string, string>();

function sanitizeKey(key: string): string {
  return (key || 'key').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function saveItem(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      try {
        await SecureStore.setItemAsync(sanitizeKey(key), value);
      } catch (secErr) {
        // Fallback to AsyncStorage if SecureStore/Keystore fails
        await AsyncStorage.setItem(key, value);
      }
    }
  } catch (error) {
    console.warn('[Storage] Error saving item:', key, error);
  }
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key) || memoryStore.get(key) || null;
    } else {
      try {
        const val = await SecureStore.getItemAsync(sanitizeKey(key));
        if (val !== null && val !== undefined) return val;
      } catch {
        // Fallback to AsyncStorage if SecureStore fails
      }
      try {
        const asyncVal = await AsyncStorage.getItem(key);
        if (asyncVal !== null && asyncVal !== undefined) return asyncVal;
      } catch {
        // Fallback to memory
      }
      return memoryStore.get(key) || null;
    }
  } catch (error) {
    console.warn('[Storage] Error getting item:', key, error);
    return memoryStore.get(key) || null;
  }
}

export async function deleteItem(key: string): Promise<void> {
  memoryStore.delete(key);
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      try {
        await SecureStore.deleteItemAsync(sanitizeKey(key));
      } catch {
        // Ignore secure store delete failure
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

