import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://narendra-kirana.onrender.com/api/v1',
});

const getPrefix = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('delivery')) return 'smart-kirana-delivery';
    if (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) return 'smart-kirana-owner';
    if (window.location.pathname.startsWith('/owner')) return 'smart-kirana-owner';
    if (window.location.pathname.startsWith('/delivery')) return 'smart-kirana-delivery';
  }
  return 'smart-kirana-customer';
};

const isAuthEndpoint = (url = '') => {
  const cleanUrl = url.toLowerCase();
  return (
    cleanUrl.includes('auth/login') ||
    cleanUrl.includes('auth/google-login') ||
    cleanUrl.includes('auth/admin-google-login') ||
    cleanUrl.includes('auth/token/refresh') ||
    cleanUrl.includes('auth/signup') ||
    cleanUrl.includes('auth/password-reset')
  );
};

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const prefix = getPrefix();
    const token = localStorage.getItem(`${prefix}-token`);
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Concurrency queue for handling 401s without duplicate refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Add a response interceptor to handle 401 Unauthorized globally with automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest || !error.response) {
      return Promise.reject(error);
    }

    if (error.response.status === 401) {
      const requestUrl = originalRequest.url || '';
      
      // If error is from an auth endpoint, do not attempt refresh
      if (isAuthEndpoint(requestUrl)) {
        return Promise.reject(error);
      }

      const prefix = getPrefix();

      // If already retried, prevent infinite loop
      if (originalRequest._retry) {
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) ? '/login' : '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : 'https://narendra-kirana-delivery.vercel.app/login';
        }
        return Promise.reject(error);
      }

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(`${prefix}-refresh`);
      if (!refreshToken) {
        processQueue(error, null);
        isRefreshing = false;
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = (window.location.hostname.includes('owner') || window.location.hostname.includes('admin')) ? '/login' : '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : 'https://narendra-kirana-delivery.vercel.app/login';
        }
        return Promise.reject(error);
      }

      try {
        const baseURL = api.defaults.baseURL || 'https://narendra-kirana.onrender.com/api/v1';
        // Use raw axios to bypass interceptor
        const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data?.access;
        const newRefreshToken = response.data?.refresh;

        if (newAccessToken) {
          localStorage.setItem(`${prefix}-token`, newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem(`${prefix}-refresh`, newRefreshToken);
          }

          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token returned from refresh');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        if (prefix === 'smart-kirana-owner') {
          window.location.href = '/owner/login';
        } else if (prefix === 'smart-kirana-delivery') {
          window.location.href = window.location.hostname.includes('delivery') ? '/login' : 'https://narendra-kirana-delivery.vercel.app/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);



// Advanced Persistent Cache (Stale-While-Revalidate)
// FIXED: Removed /notifications/ and /favorites/ — these are user-specific and must NOT be cached across users
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 20; // Prevent localStorage quota exhaustion
const CACHEABLE_URLS = [
  '/products/', 
  '/categories/', 
  '/offers/banners/', 
  '/store/settings/', 
  '/store/homepage-sections/',
];

// Evict oldest cache entries when limit is reached
function evictOldestCache() {
  const cacheKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sk_cache_')) {
      try {
        const val = JSON.parse(localStorage.getItem(key));
        cacheKeys.push({ key, timestamp: val?.timestamp || 0 });
      } catch (e) { cacheKeys.push({ key, timestamp: 0 }); }
    }
  }
  if (cacheKeys.length > MAX_CACHE_ENTRIES) {
    cacheKeys.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = cacheKeys.slice(0, cacheKeys.length - MAX_CACHE_ENTRIES);
    toRemove.forEach(entry => localStorage.removeItem(entry.key));
  }
}

const inFlightMap = new Map();

const originalGet = api.get;
api.get = async (url, config = {}) => {
  const safeUrl = url || '';
  const isOwnerRoute = window.location.pathname.startsWith('/owner');
  const hasSearchParams = config?.params?.search || config?.params?.t; // Don't cache search queries or cache-busted requests
  const isCacheable = !isOwnerRoute && !hasSearchParams && CACHEABLE_URLS.some(u => safeUrl.startsWith(u));

  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
  }
  const flightKey = safeUrl + queryString;

  if (!isCacheable) {
    if (inFlightMap.has(flightKey)) {
      return inFlightMap.get(flightKey);
    }
    const p = originalGet.call(api, url, config).finally(() => inFlightMap.delete(flightKey));
    inFlightMap.set(flightKey, p);
    return p;
  }

  const cacheKey = 'sk_cache_' + safeUrl + queryString;
  let cachedData = memoryCache.get(cacheKey);

  // 1. If not in memory, check LocalStorage (happens on every page reload)
  if (!cachedData) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
        memoryCache.set(cacheKey, cachedData);
      }
    } catch (e) { /* ignore corrupt cache entries */ }
  }

  // 2. If we found data (either in memory or LocalStorage), return it INSTANTLY
  if (cachedData) {
    const isStale = Date.now() - cachedData.timestamp > CACHE_TTL;
    
    // 3. If the data is old (stale), silently fetch fresh data in the background (deduplicated)
    if (isStale && !inFlightMap.has(flightKey)) {
      const bgPromise = originalGet.call(api, url, config)
        .then(response => {
          if (response && response.status === 200) {
            const newData = { data: response.data, timestamp: Date.now() };
            memoryCache.set(cacheKey, newData);
            try { evictOldestCache(); localStorage.setItem(cacheKey, JSON.stringify(newData)); } catch(e) {}
          }
        })
        .catch(() => { /* Ignore background errors, user still sees cached data */ })
        .finally(() => {
          inFlightMap.delete(flightKey);
        });
      inFlightMap.set(flightKey, bgPromise);
    }
    
    // Return cached data instantly (0-second wait)
    return Promise.resolve({ 
      data: cachedData.data, 
      status: 200, 
      statusText: 'OK', 
      headers: {}, 
      config: config, 
      fromCache: true 
    });
  }

  // 4. If absolutely no cache exists (very first time visiting the site ever), deduplicate in-flight
  if (inFlightMap.has(flightKey)) {
    return inFlightMap.get(flightKey);
  }

  const fetchPromise = (async () => {
    try {
      const response = await originalGet.call(api, url, config);
      if (response && response.status === 200) {
        const newData = { data: response.data, timestamp: Date.now() };
        memoryCache.set(cacheKey, newData);
        try { evictOldestCache(); localStorage.setItem(cacheKey, JSON.stringify(newData)); } catch(e) {}
      }
      return response;
    } finally {
      inFlightMap.delete(flightKey);
    }
  })();

  inFlightMap.set(flightKey, fetchPromise);
  return fetchPromise;
};

export const readCacheSync = (url, config = {}) => {
  const safeUrl = url || '';
  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
  }
  const cacheKey = 'sk_cache_' + safeUrl + queryString;
  let cachedData = memoryCache.get(cacheKey);
  if (!cachedData) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) cachedData = JSON.parse(stored);
    } catch (e) { /* ignore */ }
  }
  return cachedData ? cachedData.data : null;
};

export default api;
