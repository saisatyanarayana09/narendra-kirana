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
    const token = localStorage.getItem(${prefix}-token);
    if (token) {
      config.headers['Authorization'] = Bearer ;
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
        localStorage.removeItem(${prefix}-token);
        localStorage.removeItem(${prefix}-refresh);
        localStorage.removeItem(${prefix}-user);
        // Redirect logic
        if (prefix === 'smart-kirana-owner') {
          window.location.href = '/owner/login';
        }
      }
    }
    return Promise.reject(error);
  }
);



// Ultra-Safe Memory Cache (No LocalStorage, No JSON Parsing)
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHEABLE_URLS = [
  '/products/', 
  '/categories/', 
  '/offers/banners/', 
  '/store/settings/', 
  '/store/homepage-sections/'
];

const originalGet = api.get;
api.get = async (url, config = {}) => {
  const safeUrl = url || '';
  const isOwner = localStorage.getItem('smart-kirana-owner-token');
  
  // Only cache if it's an exact match in our safe list, has no query params, and is NOT owner
  const isCacheable = !isOwner && CACHEABLE_URLS.includes(safeUrl) && (!config || !config.params || Object.keys(config.params).length === 0);

  if (isCacheable && memoryCache.has(safeUrl)) {
    const cached = memoryCache.get(safeUrl);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      // Mock exactly what Axios returns (data, status, headers)
      return Promise.resolve({ 
        data: cached.data, 
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
        fromCache: true 
      });
    }
  }

  const response = await originalGet.call(api, url, config);
  
  if (isCacheable && response && response.status === 200) {
    memoryCache.set(safeUrl, { data: response.data, timestamp: Date.now() });
  }
  
  return response;
};

export default api;

