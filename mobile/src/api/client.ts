import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/config';
import { getItem, getItemSync, saveItem, deleteItem } from '../utils/storage';

export interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _retryCount?: number;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s network timeout to comfortably accommodate free-tier backend cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to clear stored auth credentials safely
const clearAuthStorage = async () => {
  try {
    await deleteItem(STORAGE_KEYS.TOKEN);
    await deleteItem(STORAGE_KEYS.REFRESH);
    await deleteItem(STORAGE_KEYS.USER);
  } catch (err) {
    console.warn('[ApiClient] Failed to clear auth storage:', err);
  }
};

// Endpoints that should NEVER trigger automatic token refresh
const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  const cleanUrl = url.toLowerCase();
  return (
    cleanUrl.includes('auth/login') ||
    cleanUrl.includes('auth/token/refresh') ||
    cleanUrl.includes('auth/signup') ||
    cleanUrl.includes('auth/register') ||
    cleanUrl.includes('auth/password-reset')
  );
};

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = getItemSync(STORAGE_KEYS.TOKEN) || await getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[ApiClient] Failed to retrieve auth token for request:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue for handling multiple 401s without duplicate refreshes
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor with robust 401 refresh queue & network failure resilience
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError | any) => {
    try {
      // 1. Handle Network Timeout and Disconnect Errors (ECONNABORTED, ERR_NETWORK, etc.)
      const isTimeout =
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ETIMEDOUT' ||
        error?.message?.toLowerCase().includes('timeout');

      const isNetworkError =
        error?.code === 'ERR_NETWORK' ||
        error?.code === 'ENOTFOUND' ||
        error?.code === 'ECONNREFUSED' ||
        error?.message?.toLowerCase().includes('network') ||
        (!error?.response && Boolean(error?.request));

      const originalRequest = error?.config as CustomRequestConfig | undefined;

      // Automatic retry for idempotent or cold-start waking up requests (max 2 retries)
      if (originalRequest && (isTimeout || isNetworkError)) {
        const method = (originalRequest.method || 'get').toLowerCase();
        const isSafeMethod = ['get', 'head', 'options'].includes(method);
        const maxRetries = 2;

        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
        if (isSafeMethod && originalRequest._retryCount <= maxRetries) {
          const delayMs = originalRequest._retryCount * 1500;
          console.log(
            `[ApiClient] Backend waking up or transient network hiccup. Retrying ${originalRequest.url} (attempt ${originalRequest._retryCount}/${maxRetries}) in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return apiClient(originalRequest);
        }
      }

      if (isTimeout || isNetworkError) {
        // Tag error with structured flags
        if (error) {
          error.isNetworkError = true;
          error.isTimeout = isTimeout;

          // Provide user-friendly message
          if (isTimeout) {
            error.message = 'Connection timed out. Please check your internet connection.';
          } else {
            error.message = 'Network connection error. Please verify your connection.';
          }

          // Ensure a safe fallback response structure so component catch blocks don't crash
          if (!error.response) {
            error.response = {
              status: isTimeout ? 408 : 0,
              statusText: isTimeout ? 'Request Timeout' : 'Network Error',
              data: {
                detail: error.message,
                error: isTimeout ? 'Request Timeout' : 'Network Error',
              },
              headers: {},
              config: error.config,
            };
          }
        }

        console.warn(
          `[ApiClient] Network/Timeout error: ${error?.code || 'NO_RESPONSE'} - ${error?.message}`
        );
        return Promise.reject(error);
      }

      // If no config or error has no response, reject cleanly
      if (!originalRequest || !error?.response) {
        return Promise.reject(error);
      }

      const status = error.response.status;

      // 2. Token Refresh & 401 Loop Prevention
      if (status === 401) {
        // If it's an auth endpoint (login, refresh, signup), do NOT attempt refresh
        if (isAuthEndpoint(originalRequest.url)) {
          return Promise.reject(error);
        }

        // If this request was already retried, prevent infinite loop
        if (originalRequest._retry) {
          await clearAuthStorage();
          DeviceEventEmitter.emit('AUTH_FAILED');
          return Promise.reject(error);
        }

        // If a refresh is already in progress, queue this request
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((newToken) => {
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        // Mark as retried and begin refresh process
        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await getItem(STORAGE_KEYS.REFRESH);

          if (!refreshToken) {
            processQueue(error, null);
            await clearAuthStorage();
            DeviceEventEmitter.emit('AUTH_FAILED');
            return Promise.reject(error);
          }

          // Request fresh access token using raw axios to bypass interceptor
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/token/refresh/`,
            { refresh: refreshToken },
            {
              timeout: 30000,
              headers: { 'Content-Type': 'application/json' },
            }
          );

          const newAccessToken = refreshResponse.data?.access;

          if (newAccessToken) {
            await saveItem(STORAGE_KEYS.TOKEN, newAccessToken);
            if (refreshResponse.data?.refresh) {
              await saveItem(STORAGE_KEYS.REFRESH, refreshResponse.data.refresh);
            }

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            processQueue(null, newAccessToken);
            return apiClient(originalRequest);
          } else {
            throw new Error('Refresh response did not return an access token');
          }
        } catch (refreshErr: any) {
          // Check if failure was transient network error or actual invalid token
          const isRefreshNetworkErr =
            refreshErr?.code === 'ECONNABORTED' ||
            refreshErr?.code === 'ERR_NETWORK' ||
            refreshErr?.message?.toLowerCase().includes('network') ||
            refreshErr?.message?.toLowerCase().includes('timeout') ||
            !refreshErr?.response ||
            (refreshErr?.response?.status >= 500 && refreshErr?.response?.status <= 599);

          processQueue(refreshErr, null);

          if (!isRefreshNetworkErr) {
            // Token is expired / invalid / blacklisted: clear session
            await clearAuthStorage();
            DeviceEventEmitter.emit('AUTH_FAILED');
          }

          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    } catch (interceptorErr) {
      console.error('[ApiClient] Unhandled error inside response interceptor:', interceptorErr);
      return Promise.reject(error || interceptorErr);
    }
  }
);
