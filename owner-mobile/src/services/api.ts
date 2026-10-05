import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import LRUCache from '../utils/LRUCache';
import { safeStorage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOKEN_KEY = 'smart-kirana-owner-token';
export const REFRESH_TOKEN_KEY = 'smart-kirana-owner-refresh';

let inMemoryToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

// Initialize inMemoryToken during app launch from storage
safeStorage
  .getItem(TOKEN_KEY)
  .then((token) => {
    if (token && !inMemoryToken) {
      inMemoryToken = token;
    }
  })
  .catch(() => {});

export interface CachedGetConfig<T = any> extends AxiosRequestConfig {
  /** Skip cached data and hit the network (still deduplicated). */
  forceRefresh?: boolean;
  /** Called when a background revalidation returns data that differs from what was served. */
  onUpdate?: (response: { data: T }) => void;
}

export interface ApiInstance extends AxiosInstance {
  cachedGet: <T = any>(
    url: string,
    config?: CachedGetConfig<T>
  ) => Promise<AxiosResponse<T> | { data: T; cached: true }>;
  /** Mark all cached data stale (served instantly, refreshed in background). Call after mutations. */
  clearCache: () => void;
  /** Wipe memory + disk cache completely (logout / account switch). */
  resetCache: () => Promise<void>;
  setOnUnauthorized: (cb: (() => void) | null) => void;
}

let onUnauthorizedCallback: (() => void) | null = null;

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://narendra-kirana.onrender.com/api/v1',
  timeout: 60000,
}) as ApiInstance;

// ─── Response cache: memory (LRU) + disk (AsyncStorage / localStorage) ───
type CacheEntry = { data: any; ts: number };

const CACHE_PREFIX = 'nk-owner-cache:';
const FRESH_MS = 15 * 1000; // served without any network call
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // older than this → wait for network (stale used only if offline)
const MAX_PERSIST_CHARS = 1_500_000; // Android AsyncStorage rows > ~2MB can't be read back

const apiCache = new LRUCache<CacheEntry>(60);

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
    return 'The server took too long to respond while waking up. Please try again in a few moments.';
  }

  if (error?.message === 'Network Error') {
    return 'Unable to reach the server. The backend may be waking up from sleep, or there was a temporary network interruption. Please try again in a few seconds.';
  }

  if (typeof error?.message === 'string') return error.message;
  return fallback;
}

// Request interceptor to attach the JWT token safely
api.interceptors.request.use(
  async (config) => {
    try {
      config.headers = config.headers || {};
      if (inMemoryToken) {
        config.headers['Authorization'] = `Bearer ${inMemoryToken}`;
      } else {
        const token = await safeStorage.getItem(TOKEN_KEY);
        if (token) {
          inMemoryToken = token;
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      }
      if (Platform.OS !== 'web') {
        config.headers['X-Portal-Context'] = 'owner';
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
  inMemoryToken = null;
  await safeStorage.removeItem(TOKEN_KEY);
  await safeStorage.removeItem(REFRESH_TOKEN_KEY);
  await api.resetCache();
  try {
    const { Image } = require('expo-image');
    Image.clearMemoryCache?.();
    await Image.clearDiskCache?.();
  } catch {}
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((k) => caches.delete(k)));
    } catch {}
  }
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

    // Auto-retry transient network errors and 502/503/504 cold-start waking errors
    const isTransientError =
      error?.message === 'Network Error' ||
      error?.code === 'ECONNABORTED' ||
      error?.code === 'ERR_NETWORK' ||
      (!error?.response && Boolean(error?.request)) ||
      (error?.response?.status && [502, 503, 504].includes(error.response.status));

    const RETRY_DELAYS = [2000, 4000, 8000, 14000, 20000, 24000];
    const maxRetries = RETRY_DELAYS.length;
    const currentRetry = (originalRequest as any)._retryCount || 0;
    if (isTransientError && currentRetry < maxRetries) {
      (originalRequest as any)._retryCount = currentRetry + 1;
      const delayMs = RETRY_DELAYS[currentRetry] || 20000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api(originalRequest);
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

        inMemoryToken = newAccessToken;
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

const inFlightRequests = new Map<string, { promise: Promise<AxiosResponse<any>>; startedAt: number }>();

// Invalidation markers: entries written at/before these timestamps are treated as expired/stale.
let globalExpiredBefore = 0; // set by resetCache
let globalStaleBefore = 0; // set by clearCache
const resourceExpiredBefore = new Map<string, number>(); // set automatically after mutations

const isWeb = Platform.OS === 'web';
const hasLocalStorage = () => isWeb && typeof window !== 'undefined' && !!window.localStorage;

/** '/products/?limit=100' → 'products' */
const resourceOf = (url: string): string => {
  const path = String(url || '')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(api.defaults.baseURL ? String(api.defaults.baseURL).replace(/^https?:\/\/[^/]+/i, '') : '', '')
    .split('?')[0];
  return path.split('/').filter(Boolean)[0] || '';
};

const buildCacheKey = (url: string, params?: any): string => {
  if (!params || typeof params !== 'object' || Object.keys(params).length === 0) return url;
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${String(params[k])}`)
    .join('&');
  return `${url}${url.includes('?') ? '&' : '?'}${sorted}`;
};

const diskCache = {
  async get(key: string): Promise<CacheEntry | null> {
    try {
      const raw = hasLocalStorage()
        ? window.localStorage.getItem(CACHE_PREFIX + key)
        : isWeb
          ? null
          : await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed.ts === 'number' ? (parsed as CacheEntry) : null;
    } catch {
      return null;
    }
  },
  async set(key: string, entry: CacheEntry): Promise<void> {
    try {
      const raw = JSON.stringify(entry);
      if (raw.length > MAX_PERSIST_CHARS) {
        await diskCache.remove(key); // too large to persist safely; keep memory-only
        return;
      }
      if (hasLocalStorage()) window.localStorage.setItem(CACHE_PREFIX + key, raw);
      else if (!isWeb) await AsyncStorage.setItem(CACHE_PREFIX + key, raw);
    } catch {
      // Quota exceeded or storage unavailable — memory cache still works
    }
  },
  async remove(key: string): Promise<void> {
    try {
      if (hasLocalStorage()) window.localStorage.removeItem(CACHE_PREFIX + key);
      else if (!isWeb) await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch {}
  },
  async clear(): Promise<void> {
    try {
      if (hasLocalStorage()) {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(CACHE_PREFIX)) keys.push(k);
        }
        keys.forEach((k) => window.localStorage.removeItem(k));
      } else if (!isWeb) {
        const all = await AsyncStorage.getAllKeys();
        const ours = all.filter((k) => k.startsWith(CACHE_PREFIX));
        if (ours.length) await AsyncStorage.multiRemove(ours);
      }
    } catch {}
  },
};

type EntryState = 'fresh' | 'stale' | 'expired';

const getEntryState = (key: string, entry: CacheEntry): EntryState => {
  const expiredMark = Math.max(globalExpiredBefore, resourceExpiredBefore.get(resourceOf(key)) ?? 0);
  if (entry.ts <= expiredMark) return 'expired';
  const age = Date.now() - entry.ts;
  if (age >= MAX_AGE_MS) return 'expired';
  if (age >= FRESH_MS || entry.ts <= globalStaleBefore) return 'stale';
  return 'fresh';
};

const isSameData = (a: any, b: any): boolean => {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

// Stale-while-revalidate GET with memory + disk persistence and request deduplication
api.cachedGet = async <T = any>(
  url: string,
  config: CachedGetConfig<T> = {}
): Promise<AxiosResponse<T> | { data: T; cached: true }> => {
  const { forceRefresh, onUpdate, ...axiosConfig } = config;
  const key = buildCacheKey(url, axiosConfig.params);

  let entry = apiCache.get(key);
  if (!entry) {
    const fromDisk = await diskCache.get(key);
    // Ignore disk data if the cache was reset while we were reading
    if (fromDisk && fromDisk.ts > globalExpiredBefore) {
      entry = fromDisk;
      apiCache.put(key, fromDisk);
    }
  }

  const invalidationMark = () =>
    Math.max(globalExpiredBefore, resourceExpiredBefore.get(resourceOf(key)) ?? 0);

  const fetchFresh = (): Promise<AxiosResponse<T>> => {
    const existing = inFlightRequests.get(key);
    // Reuse an identical in-flight request, unless it began before a write to this resource
    if (existing && existing.startedAt > invalidationMark()) {
      return existing.promise as Promise<AxiosResponse<T>>;
    }

    const startedAt = Date.now();
    const request = api
      .get<T>(url, axiosConfig)
      .then((response) => {
        // Don't store responses that started before a mutation/reset (could be outdated)
        if (response && response.data !== undefined && startedAt > invalidationMark()) {
          const fresh: CacheEntry = { data: response.data, ts: Date.now() };
          apiCache.put(key, fresh);
          diskCache.set(key, fresh);
        }
        return response;
      })
      .finally(() => {
        if (inFlightRequests.get(key)?.promise === request) inFlightRequests.delete(key);
      });

    inFlightRequests.set(key, { promise: request, startedAt });
    return request;
  };

  const state = entry ? getEntryState(key, entry) : 'expired';

  if (!forceRefresh && entry && state !== 'expired') {
    if (state === 'stale') {
      const served = entry.data;
      fetchFresh()
        .then((res) => {
          if (onUpdate && res && !isSameData(served, res.data)) onUpdate({ data: res.data });
        })
        .catch(() => {});
    }
    return { data: entry.data as T, cached: true };
  }

  try {
    return await fetchFresh();
  } catch (error: any) {
    // Offline / server asleep: fall back to last known data instead of an empty screen
    if (entry && !error?.response) {
      return { data: entry.data as T, cached: true };
    }
    throw error;
  }
};

api.clearCache = () => {
  globalStaleBefore = Date.now();
};

api.resetCache = async () => {
  inMemoryToken = null;
  globalExpiredBefore = Date.now();
  globalStaleBefore = globalExpiredBefore;
  resourceExpiredBefore.clear();
  inFlightRequests.clear();
  apiCache.clear();
  await diskCache.clear();
};

// Auto-invalidate: any successful write expires cached reads of the same resource
// (and marks everything else stale so related screens refresh in the background).
api.interceptors.response.use((response) => {
  const method = String(response?.config?.method || 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    const now = Date.now();
    const resource = resourceOf(response?.config?.url || '');
    if (resource) resourceExpiredBefore.set(resource, now);
    globalStaleBefore = now;
  }
  return response;
});

/** Shorthand for api.cachedGet (stale-while-revalidate, persisted). */
export const cachedGet = <T = any>(url: string, config?: CachedGetConfig<T>) =>
  api.cachedGet<T>(url, config);

export default api;
