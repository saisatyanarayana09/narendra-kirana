import * as SecureStore from 'expo-secure-store';

export async function saveItem(key: string, value: string) {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.error('Error saving securely', error);
  }
}

export async function getItem(key: string) {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.error('Error getting securely', error);
    return null;
  }
}

export async function deleteItem(key: string) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.error('Error deleting securely', error);
  }
}
