import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token fresh on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.warn('NETWORK_ERROR: Backend potentially unreachable at', API_BASE_URL);
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        
        // Do not force redirect if we are already on a public auth page
        const publicPaths = ['/login', '/signup', '/accept-invite', '/forgot-password', '/reset-password'];
        const isPublicPath = window.location.pathname === '/' || publicPaths.some(p => window.location.pathname.startsWith(p));
        
        if (!isPublicPath) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
