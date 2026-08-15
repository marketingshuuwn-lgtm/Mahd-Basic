export const MAHD_ROLES = [
  'owner-project-manager',
  'account-manager',
  'content-writer',
  'designer',
  'photographer',
  'media-manager',
  'project-coordinator',
  'campaign-executor',
];

export const PROJECT_TYPES = [
  'brand-strategy',
  'content-calendar',
  'monthly-operations',
  'promotion-campaign',
  'monthly-operations-campaign',
  'internal-operations',
];

export const ENTITY_STATUSES = ['draft', 'active', 'on_hold', 'completed', 'archived'];
export const TASK_STATUSES = ['not_started', 'in_progress', 'in_review', 'completed', 'cancelled'];
export const SYNC_STATUSES = ['local_only', 'pending_preview', 'pending_approval', 'approved', 'synced', 'conflict', 'failed', 'rejected'];

function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isoNow(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

export function createEntityId(prefix, value = Date.now()) {
  return `${prefix}-${value}`;
}

export function createExternalRef({ provider = 'trello', externalId = null, externalUrl = null, metadata = {} } = {}) {
  return { provider, externalId, externalUrl, metadata, lastReadAt: null, lastWrittenAt: null };
}

export function createClient({ id, name, description = '', status = 'active', externalRefs = [], now } = {}) {
  const cleanName = asText(name);
  if (!cleanName) throw new Error('اسم العميل مطلوب.');
  return {
    id: id || createEntityId('client'),
    entityType: 'client',
    name: cleanName,
    description: asText(description),
    status: ENTITY_STATUSES.includes(status) ? status : 'active',
    externalRefs: Array.isArray(externalRefs) ? externalRefs : [],
    createdAt: isoNow(now),
    updatedAt: isoNow(now),
  };
}

export function createProject({ id, clientId, name, type, description = '', status = 'draft', ownerId = null, now } = {}) {
  const cleanClientId = asText(clientId);
  const cleanName = asText(name);
  if (!cleanClientId) throw new Error('العميل مطلوب قبل إنشاء المشروع.');
  if (!cleanName) throw new Error('اسم المشروع مطلوب.');
  if (type && !PROJECT_TYPES.includes(type)) throw new Error('نوع المشروع غير معروف.');
  return {
    id: id || createEntityId('project'),
    entityType: 'project',
    clientId: cleanClientId,
    name: cleanName,
    type: type || null,
    description: asText(description),
    status: ENTITY_STATUSES.includes(status) ? status : 'draft',
    ownerId: ownerId || null,
    externalRefs: [],
    createdAt: isoNow(now),
    updatedAt: isoNow(now),
  };
}

export function createTask({ id, projectId = null, clientId = null, internalWorkstream = null, title, description = '', status = 'not_started', assigneeId = null, dueDate = null, now } = {}) {
  const cleanTitle = asText(title);
  if (!cleanTitle) throw new Error('عنوان المهمة مطلوب.');
  if (!projectId && !internalWorkstream) throw new Error('المهمة تحتاج مشروعًا أو مسار عمل داخلي.');
  if (projectId && !clientId) throw new Error('المهمة المرتبطة بمشروع تحتاج عميلًا.');
  return {
    id: id || createEntityId('task'),
    entityType: 'task',
    projectId: projectId || null,
    clientId: clientId || null,
    internalWorkstream: internalWorkstream || null,
    title: cleanTitle,
    description: asText(description),
    status: TASK_STATUSES.includes(status) ? status : 'not_started',
    assigneeId: assigneeId || null,
    dueDate: dueDate || null,
    externalRefs: [],
    syncStatus: 'local_only',
    createdAt: isoNow(now),
    updatedAt: isoNow(now),
  };
}

export function createSyncOperation({ entityType, entityId, operation, payload = {}, status = 'pending_preview', now } = {}) {
  if (!['client', 'project', 'task'].includes(entityType)) throw new Error('نوع الكيان غير مدعوم للمزامنة.');
  if (!entityId) throw new Error('معرّف الكيان مطلوب للمزامنة.');
  if (!['create', 'update', 'archive', 'link'].includes(operation)) throw new Error('عملية المزامنة غير معروفة.');
  return {
    id: createEntityId('sync'),
    entityType,
    entityId,
    operation,
    payload,
    status: SYNC_STATUSES.includes(status) ? status : 'pending_preview',
    previewedAt: null,
    approvedAt: null,
    executedAt: null,
    error: null,
    createdAt: isoNow(now),
    updatedAt: isoNow(now),
  };
}

export function validateTaskRelationship(task, { clients = [], projects = [] } = {}) {
  const clientIds = new Set(clients.map((client) => client.id));
  const project = projects.find((item) => item.id === task.projectId);
  if (task.clientId && !clientIds.has(task.clientId)) return { valid: false, reason: 'العميل المرتبط بالمهمة غير موجود.' };
  if (task.projectId && !project) return { valid: false, reason: 'المشروع المرتبط بالمهمة غير موجود.' };
  if (project && project.clientId !== task.clientId) return { valid: false, reason: 'المشروع والعميل لا ينتميان إلى العلاقة نفسها.' };
  if (!task.projectId && !task.internalWorkstream) return { valid: false, reason: 'المهمة بلا مشروع أو مسار عمل داخلي.' };
  return { valid: true, reason: null };
}
