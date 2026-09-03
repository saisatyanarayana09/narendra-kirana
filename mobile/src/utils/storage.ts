import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function sanitizeKey(key: string): string {
  return (key || 'key').replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function saveItem(key: string, value: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(sanitizeKey(key), value);
    }
  } catch (error) {
    console.error('Error saving securely', error);
  }
}

export async function getItem(key: string) {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(sanitizeKey(key));
    }
  } catch (error) {
    console.error('Error getting securely', error);
    return null;
  }
}

export async function deleteItem(key: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(sanitizeKey(key));
    }
  } catch (error) {
    console.error('Error deleting securely', error);
  }
}

