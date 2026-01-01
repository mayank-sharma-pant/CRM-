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

// Add token to requests if available (only in browser)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('token');
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Mock Interceptor
if (USE_MOCK_BACKEND) {
  // Simple in-memory store for the session
  let mockLeads = [...(MOCK_DATA['/leads'] || [])];

  const originalGet = api.get;
  api.get = async (url, config) => {
    // 1. Handle Leads List
    if (url === '/leads') {
      console.log('[MOCK] GET /leads');
      return new Promise(resolve => setTimeout(() => resolve({ data: mockLeads, status: 200 }), 400));
    }

    // 2. Handle specific keys
    const mockKey = Object.keys(MOCK_DATA).find(key => url.includes(key) && key !== '/leads');
    if (mockKey) {
      console.log(`[MOCK] Serving ${url}`);
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ data: MOCK_DATA[mockKey], status: 200 });
        }, 400);
      });
    }
    return originalGet(url, config);
  };

  // Mock POST (Create)
  const originalPost = api.post;
  api.post = async (url, data, config) => {
    if (url === '/leads') {
      console.log('[MOCK] POST /leads', data);
      const newLead = { id: Date.now(), ...data, created_at: new Date().toISOString() };
      mockLeads = [newLead, ...mockLeads];
      return new Promise(resolve => setTimeout(() => resolve({ data: newLead, status: 201 }), 600));
    }
    return originalPost(url, data, config);
  };

  // Mock DELETE (Delete)
  const originalDelete = api.delete;
  api.delete = async (url, config) => {
    if (url.startsWith('/leads/')) {
      const id = url.split('/').pop();
      console.log(`[MOCK] DELETE /leads/${id}`);
      mockLeads = mockLeads.filter(l => l.id != id); // loose comparison for string/number id
      return new Promise(resolve => setTimeout(() => resolve({ data: { success: true }, status: 200 }), 400));
    }
    return originalDelete(url, config);
  };

  // Mock PUT (Update)
  const originalPut = api.put;
  api.put = async (url, data, config) => {
    console.log(`[MOCK] PUT ${url}`, data);
    return new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 300));
  };
}

export default api;

