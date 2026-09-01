import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';
import { getItem, saveItem, deleteItem } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 Unauthorized and not a retry yet, and not the login endpoint
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('auth/login')
    ) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await getItem(STORAGE_KEYS.REFRESH);
        
        if (refreshToken) {
          // Attempt to refresh
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          
          if (response.data.access) {
            // Save new token
            await saveItem(STORAGE_KEYS.TOKEN, response.data.access);
            
            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed (token expired completely)
        await deleteItem(STORAGE_KEYS.TOKEN);
        await deleteItem(STORAGE_KEYS.REFRESH);
        await deleteItem(STORAGE_KEYS.USER);
        DeviceEventEmitter.emit('AUTH_FAILED');
      }
    } else if (error.response?.status === 401 && !originalRequest.url?.includes('auth/login')) {
      // It is 401, but we don't have refresh token or it's a retry that failed
      await deleteItem(STORAGE_KEYS.TOKEN);
      await deleteItem(STORAGE_KEYS.REFRESH);
      await deleteItem(STORAGE_KEYS.USER);
      DeviceEventEmitter.emit('AUTH_FAILED');
    }
    
    return Promise.reject(error);
  }
);
