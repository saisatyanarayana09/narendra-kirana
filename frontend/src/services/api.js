import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
});

// Helper to get token prefix based on URL
const getPrefix = () => window.location.pathname.startsWith('/owner') ? 'smart-kirana-owner' : 'smart-kirana-customer';

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const prefix = getPrefix();
    const token = localStorage.getItem(`${prefix}-token`);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Do not redirect or clear tokens if the error is from the login endpoint itself
      const requestUrl = error.config?.url || '';
      if (!requestUrl.includes('/auth/login/')) {
        const prefix = getPrefix();
        // Clear token and redirect to login
        localStorage.removeItem(`${prefix}-token`);
        localStorage.removeItem(`${prefix}-refresh`);
        localStorage.removeItem(`${prefix}-user`);
        // Redirect logic
        if (prefix === 'smart-kirana-owner') {
          window.location.href = '/owner/login';
        }
      }
    }
    return Promise.reject(error);
  }
);



// Advanced Persistent Cache (Stale-While-Revalidate)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes validity for fresh data
const CACHEABLE_URLS = [
  '/products/', 
  '/categories/', 
  '/offers/banners/', 
  '/store/settings/', 
  '/store/homepage-sections/'
];

// Memory cache for the current session to avoid JSON parsing repeatedly
const memoryCache = new Map();

const originalGet = api.get;
api.get = async (url, config = {}) => {
  const shouldCache = CACHEABLE_URLS.includes(url) && (!config.params || Object.keys(config.params).length === 0);
  
  if (!shouldCache) {
    return originalGet.call(api, url, config);
  }

  const cacheKey = sk_cache_;
  let cachedData = memoryCache.get(cacheKey);

  // Fallback to LocalStorage if not in memory (e.g., after a page reload)
  if (!cachedData) {
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        cachedData = JSON.parse(stored);
        memoryCache.set(cacheKey, cachedData);
      }
    } catch (e) {
      console.warn('Local storage cache read failed', e);
    }
  }

  // If we have cached data, return it INSTANTLY
  if (cachedData) {
    const isStale = Date.now() - cachedData.timestamp > CACHE_TTL;
    
    // If it's stale (older than 5 mins), fetch fresh data in the background SILENTLY
    if (isStale) {
      originalGet.call(api, url, config).then(response => {
        if (response.status === 200) {
          const newData = { data: response.data, timestamp: Date.now() };
          memoryCache.set(cacheKey, newData);
          localStorage.setItem(cacheKey, JSON.stringify(newData));
        }
      }).catch(() => { /* Ignore background fetch errors */ });
    }
    
    // Always return the cached data immediately to keep UI instantly responsive
    return Promise.resolve({ data: cachedData.data, fromCache: true, isStale });
  }

  // If absolutely no cache exists (very first visit), await the network request
  const response = await originalGet.call(api, url, config);
  
  if (response.status === 200) {
    const newData = { data: response.data, timestamp: Date.now() };
    memoryCache.set(cacheKey, newData);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newData));
    } catch(e) {
      console.warn('Local storage cache write failed', e);
    }
  }
  
  return response;
};

export default api;
