import { mahdApi } from '../lib/mahdApi.js';

const emptyState = () => ({ version: 1, clients: [], projects: [], tasks: [], deliverables: [], internalWorks: [], syncOperations: [], drafts: [], pilotRuns: [], pilotEvents: [], updatedAt: null });
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const camel = (record = {}) => ({
  ...record,
  workspaceId: record.workspace_id ?? record.workspaceId,
  clientId: record.client_id ?? record.clientId,
  projectId: record.project_id ?? record.projectId,
  taskId: record.task_id ?? record.taskId,
  assigneeId: record.assignee_user_id ?? record.assigneeId,
  ownerId: record.owner_user_id ?? record.ownerId,
  dueDate: record.due_date ?? record.dueDate,
  projectType: record.project_type ?? record.projectType,
  workstream: record.workstream,
  internalWorkstream: record.internal_workstream ?? record.internalWorkstream,
  syncStatus: record.sync_status ?? record.syncStatus,
  externalId: record.external_id ?? record.externalId,
  createdAt: record.created_at ?? record.createdAt,
  updatedAt: record.updated_at ?? record.updatedAt,
});

export function createMahdSharedRepository({ workspaceId, api = mahdApi } = {}) {
  if (!workspaceId) throw new Error('معرّف Workspace مطلوب للمستودع المشترك.');
  let lastState = emptyState();
  const load = async () => {
    const remote = await api.listEntities(workspaceId);
    lastState = {
      ...emptyState(),
      clients: remote.clients.map(camel),
      projects: remote.projects.map(camel),
      tasks: remote.tasks.map(camel),
      deliverables: remote.deliverables.map(camel),
      internalWorks: remote.internalWorks.map(camel),
      updatedAt: new Date().toISOString(),
    };
    return clone(lastState);
  };
  const save = async (entity, record) => {
    const route = entity === 'internalWorks' ? 'internal-work' : entity;
    const payload = await api.createEntity(workspaceId, route, record);
    const saved = camel(payload.entity || payload);
    lastState = { ...lastState, [entity]: [...lastState[entity].filter((item) => item.id !== saved.id), saved], updatedAt: new Date().toISOString() };
    return clone(saved);
  };
  return {
    kind: 'shared',
    workspaceId,
    load,
    saveClient: (record) => save('clients', record),
    saveProject: (record) => save('projects', record),
    saveTask: (record) => save('tasks', record),
    saveDeliverable: (record) => save('deliverables', record),
    saveInternalWork: (record) => save('internalWorks', record),
    migrateSnapshot: (snapshot) => api.migrateSnapshot(workspaceId, snapshot),
  };
}
