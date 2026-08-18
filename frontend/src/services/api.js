import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
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

export default api;
