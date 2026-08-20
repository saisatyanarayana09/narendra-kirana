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
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHEABLE_URLS = [
  '/products/', 
  '/categories/', 
  '/offers/banners/', 
  '/store/settings/', 
  '/store/homepage-sections/',
  '/notifications/',
  '/favorites/',
];

const originalGet = api.get;
api.get = async (url, config = {}) => {
  const safeUrl = url || '';
  const isOwner = localStorage.getItem('smart-kirana-owner-token');
  const isCacheable = !isOwner && CACHEABLE_URLS.some(u => safeUrl.startsWith(u));

  if (!isCacheable) {
    return originalGet.call(api, url, config);
  }

  let queryString = '';
  if (config && config.params && Object.keys(config.params).length > 0) {
    queryString = '?' + new URLSearchParams(config.params).toString();
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
    } catch (e) {
      console.warn('Cache read error', e);
    }
  }

  // 2. If we found data (either in memory or LocalStorage), return it INSTANTLY
  if (cachedData) {
    const isStale = Date.now() - cachedData.timestamp > CACHE_TTL;
    
    // 3. If the data is old (stale), silently fetch fresh data in the background
    if (isStale) {
      originalGet.call(api, url, config)
        .then(response => {
          if (response && response.status === 200) {
            const newData = { data: response.data, timestamp: Date.now() };
            memoryCache.set(cacheKey, newData);
            try { localStorage.setItem(cacheKey, JSON.stringify(newData)); } catch(e) {}
          }
        })
        .catch(() => { /* Ignore background errors, user still sees cached data */ });
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

  // 4. If absolutely no cache exists (very first time visiting the site ever)
  const response = await originalGet.call(api, url, config);
  if (response && response.status === 200) {
    const newData = { data: response.data, timestamp: Date.now() };
    memoryCache.set(cacheKey, newData);
    try { localStorage.setItem(cacheKey, JSON.stringify(newData)); } catch(e) {}
  }
  return response;
};

export default api;

