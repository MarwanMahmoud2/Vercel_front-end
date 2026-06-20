import axios from 'axios';

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// CSRF is not needed for pure token-based Sanctum auth, but keep a no-op for compatibility
export const ensureCsrf = () => Promise.resolve();

// Request interceptor - attach token on every call
client.interceptors.request.use(
  (config) => {
    // Check localStorage first, then sessionStorage (for Remember Me support)
    const token = localStorage.getItem('nbis_token') || sessionStorage.getItem('nbis_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Allow browser to set proper Content-Type for FormData (file uploads)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - on 401, clear token and redirect to login
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return client(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Clear both storage types
      localStorage.removeItem('nbis_token');
      localStorage.removeItem('nbis_user');
      localStorage.removeItem('nbis_remember');
      sessionStorage.removeItem('nbis_token');
      sessionStorage.removeItem('nbis_user');

      processQueue(error, null);
      isRefreshing = false;

      // Redirect to login (avoid redirect loop)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default client;
