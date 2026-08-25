import axios from 'axios';

// Always same-origin `/api` so Next.js rewrites (next.config.mjs → BACKEND_URL) handle the hop.
// The browser never calls AWS directly → no CORS. Do not set NEXT_PUBLIC_API_URL to another host
// unless you also configure CORS on the API for https://crm.perioxia.com.
const API_BASE_URL = '';
const ACTIVE_TEAM_KEY = 'crm.activeTeamId';
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
      console.warn('NETWORK_ERROR: Backend unreachable (check /api rewrite and BACKEND_URL)');
    }

    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Do not force redirect if we are already on a public auth page
        const publicPaths = ['/login', '/signup', '/accept-invite', '/forgot-password', '/reset-password', '/platform/login'];
        const path = window.location.pathname;
        const isPublicPath = path === '/' || path === '/f' || path.startsWith('/f/') || publicPaths.some(p => path.startsWith(p));

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

export const twoFactor = {
  status: () => api.get('/auth/2fa/status').then(r => r.data),
  setup: (setupToken) => api.post('/auth/2fa/setup', {}, setupToken ? { headers: { 'X-Setup-Token': setupToken } } : {}).then(r => r.data),
  confirm: (code, setupToken) => api.post('/auth/2fa/confirm', { code }, setupToken ? { headers: { 'X-Setup-Token': setupToken } } : {}).then(r => r.data),
  disable: (password) => api.post('/auth/2fa/disable', { password }).then(r => r.data),
  regenerate: (password) => api.post('/auth/2fa/recovery-codes/regenerate', { password }).then(r => r.data),
  verify: (mfa_token, code) => api.post('/auth/2fa/verify', { mfa_token, code }).then(r => r.data),
};

export const companySecurity = {
  getRequire2FA: () => api.get('/company/security').then(r => r.data),
  setRequire2FA: (require_2fa) => api.patch('/company/security', { require_2fa }).then(r => r.data),
};
