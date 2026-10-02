import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import LRUCache from '../utils/LRUCache';
import { safeStorage } from '../utils/storage';

export const TOKEN_KEY = 'smart-kirana-owner-token';
export const REFRESH_TOKEN_KEY = 'smart-kirana-owner-refresh';

export interface ApiInstance extends AxiosInstance {
  cachedGet: <T = any>(
    url: string,
    config?: AxiosRequestConfig & { forceRefresh?: boolean }
  ) => Promise<AxiosResponse<T> | { data: T; cached: true }>;
  clearCache: () => void;
  setOnUnauthorized: (cb: (() => void) | null) => void;
}

let onUnauthorizedCallback: (() => void) | null = null;

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://narendra-kirana.onrender.com/api/v1',
  timeout: 45000,
}) as ApiInstance;

const apiCache = new LRUCache<any>(30);

api.setOnUnauthorized = (cb: (() => void) | null) => {
  onUnauthorizedCallback = cb;
};

export function getErrorMessage(error: any, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const data = error?.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;
    if (typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const val = data[firstKey];
        if (Array.isArray(val) && val.length > 0) return String(val[0]);
        if (typeof val === 'string') return val;
      }
    }
  }

  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return 'Server is taking too long to respond (it may be waking up). Please try again in a moment.';
  }

  if (error?.message === 'Network Error') {
    return `Unable to reach the server at ${error?.config?.baseURL || 'unknown URL'}. Please check your internet connection.`;
  }

  if (typeof error?.message === 'string') return error.message;
  return fallback;
}

// Request interceptor to attach the JWT token safely
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await safeStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Ignore storage read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error || !token) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const handleForceLogout = async () => {
  await safeStorage.removeItem(TOKEN_KEY);
  await safeStorage.removeItem(REFRESH_TOKEN_KEY);
  apiCache.clear();
  if (api.defaults?.headers?.common) {
    delete api.defaults.headers.common['Authorization'];
  }
  if (onUnauthorizedCallback) {
    try {
      onUnauthorizedCallback();
    } catch {
      // Ignore callback error
    }
  }
};

// Response interceptor to handle 401s and token refresh cleanly without unhandled rejections
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || '');
    // Ignore login and token refresh endpoints to prevent infinite loops
    if (requestUrl.includes('/auth/login/') || requestUrl.includes('/auth/token/refresh/')) {
      return Promise.reject(error);
    }

    if (error?.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await safeStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          await handleForceLogout();
          return Promise.reject(error);
        }

        const res = await axios.post(
          `${api.defaults.baseURL}/auth/token/refresh/`,
          { refresh: refreshToken },
          { timeout: 15000 }
        );

        const newAccessToken = res?.data?.access;
        if (!newAccessToken) {
          throw new Error('Invalid token refresh response');
        }

        await safeStorage.setItem(TOKEN_KEY, newAccessToken);
        if (res?.data?.refresh) {
          await safeStorage.setItem(REFRESH_TOKEN_KEY, res.data.refresh);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await handleForceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

const inFlightRequests = new Map<string, Promise<any>>();

// DSA Application: LRU Cache wrapper for GET requests
api.cachedGet = async <T = any>(
  url: string,
  config: AxiosRequestConfig & { forceRefresh?: boolean } = {}
): Promise<AxiosResponse<T> | { data: T; cached: true }> => {
  const clonedConfig = { ...config };
  const forceRefresh = Boolean(clonedConfig.forceRefresh);
  delete clonedConfig.forceRefresh;

  const cachedResponse = apiCache.get(url);
  const hasCache = cachedResponse !== null && cachedResponse !== undefined;

  const fetchFresh = (): Promise<AxiosResponse<T>> => {
    const request = api.get<T>(url, clonedConfig).then((response) => {
      if (response && response.data !== undefined) {
        apiCache.put(url, response.data);
      }
      return response;
    }).finally(() => {
      if (inFlightRequests.get(url) === request) {
        inFlightRequests.delete(url);
      }
    });
    return request;
  };

  if (!forceRefresh && hasCache) {
    if (!inFlightRequests.has(url)) {
      const backgroundRequest = fetchFresh();
      inFlightRequests.set(url, backgroundRequest);
      backgroundRequest.catch(() => {});
    }
    return { data: cachedResponse as T, cached: true };
  }

  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<AxiosResponse<T>>;
  }

  const request = fetchFresh();
  inFlightRequests.set(url, request);
  return request;
};

api.clearCache = () => {
  apiCache.clear();
};

export default api;
