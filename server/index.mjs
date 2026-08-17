import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createDatabase } from './db.mjs';
import { acceptWorkspaceInvitation, authenticateUser, createSession, createUser, createWorkspaceForUser, createWorkspaceInvitation, getActiveMembership, listUserWorkspaces, revokeSession, sessionCookie, userFromRequest } from './auth.mjs';
import { hasPermission, permissionForEntity } from './permissions.mjs';

const PORT = Number(process.env.PORT || 8787);
const db = createDatabase();

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function now() { return new Date().toISOString(); }

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function workspaceId(req) {
  const value = req.headers['x-workspace-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requireMembership(req, res) {
  const user = userFromRequest(db, req);
  if (!user) {
    send(res, 401, { error: 'جلسة صالحة مطلوبة.' });
    return null;
  }
  const id = workspaceId(req);
  if (!id) {
    send(res, 400, { error: 'x-workspace-id مطلوب لتحديد مساحة العمل.' });
    return null;
  }
  const membership = getActiveMembership(db, user.id, id);
  if (!membership) {
    send(res, 403, { error: 'لا توجد عضوية نشطة في مساحة العمل المطلوبة.' });
    return null;
  }
  return { user, membership, workspaceId: id };
}

function listForWorkspace(table, workspace) {
  return db.prepare(`SELECT * FROM ${table} WHERE workspace_id = ? ORDER BY created_at DESC`).all(workspace);
}

const ENTITY_TABLE_MAP = { 'internal-work': 'internal_work' };

function migrateSnapshot(workspaceId, snapshot) {
  const collections = {
    clients: Array.isArray(snapshot?.clients) ? snapshot.clients : [],
    projects: Array.isArray(snapshot?.projects) ? snapshot.projects : [],
    tasks: Array.isArray(snapshot?.tasks) ? snapshot.tasks : [],
    deliverables: Array.isArray(snapshot?.deliverables) ? snapshot.deliverables : [],
    'internal-work': Array.isArray(snapshot?.internalWorks) ? snapshot.internalWorks : [],
  };
  if (collections.tasks.some((task) => task.internalWorkstream && (!task.clientId || !task.projectId))) {
    throw new Error('ترحيل المهام الداخلية مؤجل حتى يدعم مخطط المهام علاقات اختيارية بالعميل والمشروع.');
  }
  const tables = Object.values(ENTITY_TABLE_MAP).concat(['clients', 'projects', 'tasks', 'deliverables']);
  const existing = tables.some((table) => db.prepare(`SELECT 1 FROM ${table} WHERE workspace_id = ? LIMIT 1`).get(workspaceId));
  if (existing) throw new Error('مساحة العمل تحتوي بيانات؛ لا يُسمح بترحيل Snapshot فوق بيانات قائمة.');
  const order = [
    ['clients', collections.clients],
    ['projects', collections.projects],
    ['tasks', collections.tasks],
    ['deliverables', collections.deliverables],
    ['internal-work', collections['internal-work']],
  ];
  db.exec('BEGIN');
  try {
    const created = {};
    for (const [entity, records] of order) {
      created[entity] = records.map((record) => createEntity(workspaceId, entity, {
        ...record,
        type: record.type || record.projectType,
        ownerUserId: record.ownerId,
        assigneeUserId: record.assigneeId,
        dueDate: record.dueDate,
        internalWorkstream: record.internalWorkstream,
        syncStatus: record.syncStatus,
      }));
    }
    db.exec('COMMIT');
    return created;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function createEntity(workspaceId, entity, body) {
  const table = ENTITY_TABLE_MAP[entity] || entity;
  const id = String(body.id || randomUUID());
  const timestamp = now();
  if (entity === 'clients') {
    const name = String(body.name || '').trim();
    if (!name) throw new Error('اسم العميل مطلوب.');
    db.prepare('INSERT INTO clients (id, workspace_id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, name, String(body.description || ''), String(body.status || 'active'), timestamp, timestamp);
  } else if (entity === 'projects') {
    const name = String(body.name || '').trim();
    if (!name || !body.clientId) throw new Error('اسم المشروع ومعرّف العميل مطلوبان.');
    db.prepare('INSERT INTO projects (id, workspace_id, client_id, name, project_type, description, status, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, String(body.clientId), name, String(body.type || body.projectType || ''), String(body.description || ''), String(body.status || 'draft'), body.ownerUserId || null, timestamp, timestamp);
  } else if (entity === 'tasks') {
    const title = String(body.title || '').trim();
    if (!title || !body.clientId || !body.projectId) throw new Error('عنوان المهمة والعميل والمشروع مطلوبة.');
    db.prepare('INSERT INTO tasks (id, workspace_id, client_id, project_id, title, description, status, assignee_user_id, due_date, internal_workstream, sync_status, external_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, String(body.clientId), String(body.projectId), title, String(body.description || ''), String(body.status || 'not_started'), body.assigneeUserId || null, body.dueDate || null, body.internalWorkstream || null, String(body.syncStatus || 'local_only'), body.externalId || null, timestamp, timestamp);
  } else if (entity === 'deliverables') {
    const title = String(body.title || '').trim();
    if (!title || !body.clientId || !body.projectId) throw new Error('اسم المخرج والعميل والمشروع مطلوبة.');
    db.prepare('INSERT INTO deliverables (id, workspace_id, client_id, project_id, task_id, title, type, description, status, owner_user_id, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, String(body.clientId), String(body.projectId), body.taskId || null, title, String(body.type || 'general'), String(body.description || ''), String(body.status || 'planned'), body.ownerUserId || null, body.dueDate || null, timestamp, timestamp);
  } else if (entity === 'internal-work') {
    const title = String(body.title || '').trim();
    if (!title) throw new Error('عنوان العمل الداخلي مطلوب.');
    db.prepare('INSERT INTO internal_work (id, workspace_id, title, workstream, description, status, assignee_user_id, due_date, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, title, String(body.workstream || 'company-operations'), String(body.description || ''), String(body.status || 'not_started'), body.assigneeUserId || null, body.dueDate || null, String(body.syncStatus || 'local_only'), timestamp, timestamp);
  }
  return db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

const server = createServer(async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-headers', 'content-type, x-workspace-id');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    res.setHeader('vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, service: 'mahd-backend', storage: 'sqlite-shared-pilot' });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readJson(req);
      const user = createUser(db, body);
      const session = createSession(db, user.id);
      res.setHeader('set-cookie', sessionCookie(session.token));
      return send(res, 201, { user, expiresAt: session.expiresAt });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(req);
      const user = authenticateUser(db, body);
      const session = createSession(db, user.id);
      res.setHeader('set-cookie', sessionCookie(session.token));
      return send(res, 200, { user, expiresAt: session.expiresAt });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = userFromRequest(db, req)?.token;
      revokeSession(db, token);
      res.setHeader('set-cookie', sessionCookie('', 0));
      return send(res, 200, { ok: true });
    }
    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const user = userFromRequest(db, req);
      if (!user) return send(res, 401, { error: 'جلسة غير صالحة أو منتهية.' });
      const { token, ...safeUser } = user;
      return send(res, 200, { user: safeUser });
    }
    if (req.method === 'GET' && url.pathname === '/api/workspaces') {
      const user = userFromRequest(db, req);
      if (!user) return send(res, 401, { error: 'جلسة صالحة مطلوبة لقراءة مساحات العمل.' });
      return send(res, 200, { workspaces: listUserWorkspaces(db, user.id) });
    }
    if (req.method === 'POST' && url.pathname === '/api/workspaces') {
      const user = userFromRequest(db, req);
      if (!user) return send(res, 401, { error: 'جلسة صالحة مطلوبة لإنشاء مساحة عمل.' });
      const body = await readJson(req);
      const workspace = createWorkspaceForUser(db, user, body);
      return send(res, 201, { workspace, membership: getActiveMembership(db, user.id, workspace.id) });
    }
    const invitationMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/invitations$/);
    if (req.method === 'POST' && invitationMatch) {
      const access = requireMembership(req, res);
      if (!access) return;
      if (!hasPermission(access.membership, 'manage_members')) return send(res, 403, { error: 'لا تملك صلاحية إدارة أعضاء مساحة العمل.' });
      const body = await readJson(req);
      return send(res, 201, { invitation: createWorkspaceInvitation(db, { workspaceId: invitationMatch[1], invitedBy: access.user.id, email: body.email, role: body.role || 'project_coordinator' }) });
    }
    if (req.method === 'POST' && url.pathname === '/api/invitations/accept') {
      const user = userFromRequest(db, req);
      if (!user) return send(res, 401, { error: 'جلسة صالحة مطلوبة لقبول الدعوة.' });
      const body = await readJson(req);
      return send(res, 200, { membership: acceptWorkspaceInvitation(db, { token: body.token, user }) });
    }
    const workspace = requireMembership(req, res);
    if (!workspace) return;
    const workspaceId = workspace.workspaceId;
    const pilotRunMatch = url.pathname.match(/^\/api\/pilot-runs\/([^/]+)$/);
    const pilotEventsMatch = url.pathname.match(/^\/api\/pilot-runs\/([^/]+)\/events$/);
    if (req.method === 'GET' && url.pathname === '/api/pilot-runs') {
      if (!hasPermission(workspace.membership, 'read_pilot_runs')) return send(res, 403, { error: 'لا تملك صلاحية قراءة سجلات Pilot.' });
      const runs = db.prepare('SELECT * FROM pilot_runs WHERE workspace_id = ? ORDER BY created_at DESC').all(workspaceId).map((run) => ({ ...run, baseline: JSON.parse(run.baseline_json || '{}') }));
      return send(res, 200, { pilotRuns: runs });
    }
    if (req.method === 'POST' && url.pathname === '/api/pilot-runs') {
      if (!hasPermission(workspace.membership, 'create_pilot_runs')) return send(res, 403, { error: 'لا تملك صلاحية إنشاء Pilot.' });
      const body = await readJson(req);
      const clientId = String(body.clientId || '').trim();
      const projectId = String(body.projectId || '').trim();
      const deliverableId = String(body.deliverableId || '').trim();
      const title = String(body.title || '').trim();
      if (!clientId || !projectId || !deliverableId || !title) return send(res, 400, { error: 'Pilot يحتاج عميلًا ومشروعًا ومخرجًا وعنوانًا.' });
      const related = db.prepare(`SELECT d.id FROM deliverables d JOIN projects p ON p.id = d.project_id AND p.workspace_id = d.workspace_id JOIN clients c ON c.id = d.client_id AND c.workspace_id = d.workspace_id WHERE d.id = ? AND d.project_id = ? AND d.client_id = ? AND d.workspace_id = ?`).get(deliverableId, projectId, clientId, workspaceId);
      if (!related) return send(res, 422, { error: 'علاقات Pilot لا تنتمي إلى Workspace الحالية أو غير مترابطة.' });
      const id = String(body.id || randomUUID());
      const timestamp = now();
      db.prepare('INSERT INTO pilot_runs (id, workspace_id, client_id, project_id, deliverable_id, title, status, actor_user_id, baseline_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, clientId, projectId, deliverableId, title, ['planned', 'active'].includes(body.status) ? body.status : 'planned', workspace.user.id, JSON.stringify(body.baseline || {}), timestamp, timestamp);
      return send(res, 201, { pilotRun: db.prepare('SELECT * FROM pilot_runs WHERE id = ?').get(id) });
    }
    if (pilotEventsMatch && req.method === 'GET') {
      if (!hasPermission(workspace.membership, 'read_pilot_runs')) return send(res, 403, { error: 'لا تملك صلاحية قراءة أحداث Pilot.' });
      const run = db.prepare('SELECT id FROM pilot_runs WHERE id = ? AND workspace_id = ?').get(pilotEventsMatch[1], workspaceId);
      if (!run) return send(res, 404, { error: 'سجل Pilot غير موجود في Workspace الحالية.' });
      return send(res, 200, { events: db.prepare('SELECT * FROM pilot_events WHERE run_id = ? AND workspace_id = ? ORDER BY at ASC').all(run.id, workspaceId).map((event) => ({ ...event, metadata: JSON.parse(event.metadata_json || '{}') })) });
    }
    if (pilotEventsMatch && req.method === 'POST') {
      if (!hasPermission(workspace.membership, 'record_pilot_events')) return send(res, 403, { error: 'لا تملك صلاحية تسجيل أحداث Pilot.' });
      const run = db.prepare('SELECT id, status FROM pilot_runs WHERE id = ? AND workspace_id = ?').get(pilotEventsMatch[1], workspaceId);
      if (!run) return send(res, 404, { error: 'سجل Pilot غير موجود في Workspace الحالية.' });
      const body = await readJson(req);
      const allowedTypes = ['started', 'progress', 'error', 'rework', 'review_submitted', 'review_approved', 'delivered', 'delivery_accepted'];
      const type = String(body.type || '');
      const minutes = Number(body.minutes || 0);
      if (!allowedTypes.includes(type)) return send(res, 400, { error: 'نوع حدث Pilot غير معروف.' });
      if (!Number.isFinite(minutes) || minutes < 0) return send(res, 400, { error: 'دقائق الجهد يجب أن تكون رقمًا غير سالب.' });
      const id = String(body.id || randomUUID());
      const at = body.at || now();
      db.prepare('INSERT INTO pilot_events (id, workspace_id, run_id, type, minutes, note, at, actor_user_id, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, workspaceId, run.id, type, minutes, String(body.note || ''), at, workspace.user.id, JSON.stringify(body.metadata || {}), now());
      if (type === 'started') db.prepare("UPDATE pilot_runs SET status = 'active', updated_at = ? WHERE id = ?").run(now(), run.id);
      if (type === 'delivery_accepted') db.prepare("UPDATE pilot_runs SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?").run(at, now(), run.id);
      return send(res, 201, { event: db.prepare('SELECT * FROM pilot_events WHERE id = ?').get(id) });
    }
    if (pilotRunMatch && req.method === 'GET') {
      if (!hasPermission(workspace.membership, 'read_pilot_runs')) return send(res, 403, { error: 'لا تملك صلاحية قراءة سجل Pilot.' });
      const run = db.prepare('SELECT * FROM pilot_runs WHERE id = ? AND workspace_id = ?').get(pilotRunMatch[1], workspaceId);
      if (!run) return send(res, 404, { error: 'سجل Pilot غير موجود في Workspace الحالية.' });
      const events = db.prepare('SELECT * FROM pilot_events WHERE run_id = ? AND workspace_id = ? ORDER BY at ASC').all(run.id, workspaceId);
      return send(res, 200, { pilotRun: { ...run, baseline: JSON.parse(run.baseline_json || '{}'), events: events.map((event) => ({ ...event, metadata: JSON.parse(event.metadata_json || '{}') })) } });
    }
    const migrationMatch = url.pathname.match(/^\/api\/workspaces\/([^/]+)\/migrate$/);
    if (req.method === 'POST' && migrationMatch) {
      if (migrationMatch[1] !== workspaceId) return send(res, 403, { error: 'مساحة الترحيل لا تطابق مساحة الطلب.' });
      if (!hasPermission(workspace.membership, 'migrate_entities')) return send(res, 403, { error: 'ترحيل الكيانات متاح للمالك فقط.' });
      const body = await readJson(req);
      try {
        return send(res, 201, { migrated: migrateSnapshot(workspaceId, body) });
      } catch (error) {
        if (error.message.includes('تحتوي بيانات')) return send(res, 409, { error: error.message });
        if (error.message.includes('المهام الداخلية')) return send(res, 422, { error: error.message });
        throw error;
      }
    }
    const entityMatch = url.pathname.match(/^\/api\/(clients|projects|tasks|deliverables|internal-work)$/);
    if (req.method === 'POST' && entityMatch) {
      const entity = entityMatch[1];
      if (!hasPermission(workspace.membership, permissionForEntity(entity, 'create'))) return send(res, 403, { error: 'لا تملك صلاحية إنشاء هذا النوع من السجلات.' });
      const body = await readJson(req);
      return send(res, 201, { entity: createEntity(workspaceId, entity, body) });
    }
    if (req.method === 'GET' && url.pathname === '/api/clients' && hasPermission(workspace.membership, 'read_clients')) return send(res, 200, listForWorkspace('clients', workspaceId));
    if (req.method === 'GET' && url.pathname === '/api/projects' && hasPermission(workspace.membership, 'read_projects')) return send(res, 200, listForWorkspace('projects', workspaceId));
    if (req.method === 'GET' && url.pathname === '/api/tasks' && hasPermission(workspace.membership, 'read_tasks')) return send(res, 200, listForWorkspace('tasks', workspaceId));
    if (req.method === 'GET' && url.pathname === '/api/deliverables' && hasPermission(workspace.membership, 'read_deliverables')) return send(res, 200, listForWorkspace('deliverables', workspaceId));
    if (req.method === 'GET' && url.pathname === '/api/internal-work' && hasPermission(workspace.membership, 'read_internal_work')) return send(res, 200, listForWorkspace('internal_work', workspaceId));
    if (req.method === 'GET' && url.pathname === '/api/pilot-runs' && hasPermission(workspace.membership, 'read_pilot_runs')) return send(res, 200, listForWorkspace('pilot_runs', workspaceId));
    if (req.method === 'GET' && url.pathname === '/api/sync-operations' && hasPermission(workspace.membership, 'read_sync_operations')) return send(res, 200, listForWorkspace('sync_operations', workspaceId));
    if (req.method === 'GET' && url.pathname.startsWith('/api/')) return send(res, 403, { error: 'الدور الحالي لا يملك صلاحية الوصول إلى هذا المورد.' });
    send(res, 404, { error: 'المسار غير موجود.' });
  } catch (error) {
    send(res, 500, { error: 'خطأ داخلي في Backend.', detail: error.message });
  }
});

server.listen(PORT, () => console.log(`Mahd backend listening on http://localhost:${PORT}`));
