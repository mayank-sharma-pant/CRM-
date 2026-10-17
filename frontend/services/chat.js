import api from './api';

export const chatApi = {
  status: () => api.get('/chat/status').then((r) => r.data),
  sync: () => api.get('/chat/sync').then((r) => r.data),
  directory: (q, limit = 20) => api.get('/chat/directory', { params: { q: q || undefined, limit } }).then((r) => r.data.items),
  presence: (userIds) => api.get('/chat/presence', { params: { user_ids: userIds.join(',') } }).then((r) => r.data.online),
  conversations: (skip = 0, limit = 50) => api.get('/chat/conversations', { params: { skip, limit } }).then((r) => r.data),
  conversation: (id) => api.get(`/chat/conversations/${id}`).then((r) => r.data),
  startDirect: (userId) => api.post('/chat/conversations/direct', { user_id: userId }).then((r) => r.data),
  messages: (id, params = {}) => api.get(`/chat/conversations/${id}/messages`, { params }).then((r) => r.data),
  send: (id, body, clientMsgId) => api.post(`/chat/conversations/${id}/messages`, { body, client_msg_id: clientMsgId }).then((r) => r.data),
  markRead: (id, seq) => api.post(`/chat/conversations/${id}/read`, { seq }).then((r) => r.data),
  wsTicket: () => api.post('/chat/ws-ticket').then((r) => r.data),
};

export function apiErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  return fallback;
}

export function newClientMsgId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
