const API_BASE = import.meta.env.VITE_MAHD_API_URL || 'http://localhost:8787';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'تعذر الاتصال بخادم مَهَد.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export const mahdApi = {
  me: () => request('/api/auth/me'),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),
  workspaces: () => request('/api/workspaces'),
  createWorkspace: (body) => request('/api/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  membership: (workspaceId) => request('/api/auth/me', { headers: { 'x-workspace-id': workspaceId } }),
};

export { API_BASE };
