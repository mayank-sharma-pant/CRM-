import axios from 'axios';
const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
const preferProxy = process.env.NODE_ENV !== 'production';

// In non-production, always prefer Next.js same-origin rewrite proxy
// (/api -> backend) to avoid CORS/host-resolution inconsistencies.
const API_BASE_URL = preferProxy ? '' : configuredApiBaseUrl;
const ACTIVE_TEAM_KEY = 'crm.activeTeamId';
console.log(configuredApiBaseUrl);
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const teamId = window.localStorage.getItem(ACTIVE_TEAM_KEY);
    if (teamId) {
      config.headers = config.headers || {};
      config.headers['X-Team-Id'] = teamId;
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
        // Do not force redirect if we are already on a public auth page
        const publicPaths = ['/login', '/signup', '/accept-invite', '/forgot-password', '/reset-password', '/platform/login'];
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

export function setActiveTeamId(teamId) {
  if (typeof window === 'undefined') return;
  if (teamId === null || teamId === undefined || teamId === '') {
    window.localStorage.removeItem(ACTIVE_TEAM_KEY);
  } else {
    window.localStorage.setItem(ACTIVE_TEAM_KEY, String(teamId));
  }
}

export function getActiveTeamId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_TEAM_KEY);
}
