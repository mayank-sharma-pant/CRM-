import axios from 'axios';
import { MOCK_DATA } from './mockData';

// --- MOCK MODE CONFIGURATION ---
// Set this to true to use mock data instead of real backend
const USE_MOCK_BACKEND = true;
// -------------------------------

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Mock Interceptor
if (USE_MOCK_BACKEND) {
  const originalGet = api.get;
  api.get = async (url, config) => {
    const mockKey = Object.keys(MOCK_DATA).find(key => url.includes(key));
    if (mockKey) {
      console.log(`[MOCK] Serving ${url}`);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: MOCK_DATA[mockKey], status: 200 });
        }, 400); // Simulate network delay
      });
    }
    return originalGet(url, config);
  };

  // Also mock 'put' for completing items if needed, mostly for visual feedback
  const originalPut = api.put;
  api.put = async (url, data, config) => {
    console.log(`[MOCK] PUT ${url}`, data);
    return new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 300));
  };
}

export default api;

