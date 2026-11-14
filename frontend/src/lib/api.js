const BASE = (import.meta.env.VITE_API_URL || '') + '/api';
const KEY = 'queuepilot_token';

export const tokenStore = {
  get: () => localStorage.getItem(KEY),
  set: (t) => localStorage.setItem(KEY, t),
  clear: () => localStorage.removeItem(KEY),
};

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && auth && token) window.dispatchEvent(new Event('queuepilot:unauthorized'));
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && v !== '' && v !== null && p.set(k, v));
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  register: (b) => request('/auth/register', { method: 'POST', body: b, auth: false }),
  login: (b) => request('/auth/login', { method: 'POST', body: b, auth: false }),
  me: () => request('/auth/me'),
  queues: () => request('/queues'),
  createQueue: (b) => request('/queues', { method: 'POST', body: b }),
  queue: (id) => request(`/queues/${id}`),
  deleteQueue: (id) => request(`/queues/${id}`, { method: 'DELETE' }),
  tokens: (id) => request(`/queues/${id}/tokens`),
  addToken: (id, name) => request(`/queues/${id}/tokens`, { method: 'POST', body: { name } }),
  callNext: (id) => request(`/queues/${id}/call-next`, { method: 'POST' }),
  moveToken: (id, direction) => request(`/tokens/${id}/move`, { method: 'PATCH', body: { direction } }),
  completeToken: (id) => request(`/tokens/${id}/complete`, { method: 'PATCH' }),
  cancelToken: (id) => request(`/tokens/${id}/cancel`, { method: 'PATCH' }),
  history: (params) => request(`/tokens/history${qs(params)}`),
  analytics: (queueId) => request(`/analytics${qs({ queueId })}`),
  publicQueue: (id) => request(`/public/queues/${id}`, { auth: false }),
};
