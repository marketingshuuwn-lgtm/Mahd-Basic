const API_BASE = import.meta.env?.VITE_MAHD_API_URL || 'http://localhost:8787';

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

async function workspaceRequest(workspaceId, path, options = {}) {
  return request(path, { ...options, headers: { 'x-workspace-id': workspaceId, ...(options.headers || {}) } });
}

export const mahdApi = {
  me: () => request('/api/auth/me'),
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: '{}' }),
  workspaces: () => request('/api/workspaces'),
  createWorkspace: (body) => request('/api/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  listEntities: async (workspaceId) => {
    const [clients, projects, tasks, deliverables, internalWorks] = await Promise.all([
      workspaceRequest(workspaceId, '/api/clients'),
      workspaceRequest(workspaceId, '/api/projects'),
      workspaceRequest(workspaceId, '/api/tasks'),
      workspaceRequest(workspaceId, '/api/deliverables'),
      workspaceRequest(workspaceId, '/api/internal-work').catch((error) => error.status === 403 ? [] : Promise.reject(error)),
    ]);
    return { clients, projects, tasks, deliverables, internalWorks };
  },
  createEntity: (workspaceId, entity, record) => workspaceRequest(workspaceId, `/api/${entity}`, { method: 'POST', body: JSON.stringify(record) }),
  migrateSnapshot: (workspaceId, snapshot) => request(`/api/workspaces/${workspaceId}/migrate`, { method: 'POST', headers: { 'x-workspace-id': workspaceId }, body: JSON.stringify(snapshot) }),
  createPilotRun: (workspaceId, body) => workspaceRequest(workspaceId, '/api/pilot-runs', { method: 'POST', body: JSON.stringify(body) }),
  recordPilotEvent: (workspaceId, runId, body) => workspaceRequest(workspaceId, `/api/pilot-runs/${runId}/events`, { method: 'POST', body: JSON.stringify(body) }),
  listPilotRuns: (workspaceId) => workspaceRequest(workspaceId, '/api/pilot-runs'),
};

export { API_BASE };
