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




// Advanced Persistent Cache (Stale-While-Revalidate) - Site-wide
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes validity

// We cache ALL GET requests except for sensitive user data
const DO_NOT_CACHE = [
  '/accounts/',
  '/cart/',
  '/orders/',
  '/wallet/',
  '/favorites/',
  '/referrals/'
];

const memoryCache = new Map();

const originalGet = api.get;
api.get = async (url, config = {}) => {
  // Never cache for the store owner (they need real-time data)
  const isOwner = localStorage.getItem('smart-kirana-owner-token');
  
  // Never cache sensitive user endpoints
  const isBlacklisted = DO_NOT_CACHE.some(endpoint => url.includes(endpoint));
  
  if (isOwner || isBlacklisted) {
    return originalGet.call(api, url, config);
  }

  // Create a unique key that includes search/filter parameters
  const queryString = config.params ? '?' + new URLSearchParams(config.params).toString() : '';
  const cacheKey = 'sk_cache_' + url + queryString;
  
  let cachedData = memoryCache.get(cacheKey);

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

  if (cachedData) {
    const isStale = Date.now() - cachedData.timestamp > CACHE_TTL;
    
    if (isStale) {
      originalGet.call(api, url, config).then(response => {
        if (response.status === 200) {
          const newData = { data: response.data, timestamp: Date.now() };
          memoryCache.set(cacheKey, newData);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(newData));
          } catch(e) {}
        }
      }).catch(() => {});
    }
    
    return Promise.resolve({ data: cachedData.data, fromCache: true, isStale });
  }

  const response = await originalGet.call(api, url, config);
  
  if (response.status === 200) {
    const newData = { data: response.data, timestamp: Date.now() };
    memoryCache.set(cacheKey, newData);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(newData));
    } catch(e) {}
  }
  
  return response;
};

export default api;
