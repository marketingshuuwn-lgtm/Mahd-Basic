import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createDatabase } from './db.mjs';

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

function requireWorkspace(req, res) {
  const id = workspaceId(req);
  if (!id) {
    send(res, 400, { error: 'x-workspace-id مطلوب في مرحلة Backend الحالية.' });
    return null;
  }
  return id;
}

function listForWorkspace(table, workspace) {
  return db.prepare(`SELECT * FROM ${table} WHERE workspace_id = ? ORDER BY created_at DESC`).all(workspace);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { ok: true, service: 'mahd-backend', storage: 'sqlite-shared-pilot' });
    }
    if (req.method === 'POST' && url.pathname === '/api/workspaces') {
      const body = await readJson(req);
      const id = body.id || randomUUID();
      db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run(id, String(body.name || '').trim(), now());
      return send(res, 201, { id, name: String(body.name || '').trim() });
    }
    const workspace = requireWorkspace(req, res);
    if (!workspace) return;
    if (req.method === 'GET' && url.pathname === '/api/clients') return send(res, 200, listForWorkspace('clients', workspace));
    if (req.method === 'GET' && url.pathname === '/api/projects') return send(res, 200, listForWorkspace('projects', workspace));
    if (req.method === 'GET' && url.pathname === '/api/tasks') return send(res, 200, listForWorkspace('tasks', workspace));
    if (req.method === 'GET' && url.pathname === '/api/deliverables') return send(res, 200, listForWorkspace('deliverables', workspace));
    if (req.method === 'GET' && url.pathname === '/api/internal-work') return send(res, 200, listForWorkspace('internal_work', workspace));
    if (req.method === 'GET' && url.pathname === '/api/pilot-runs') return send(res, 200, listForWorkspace('pilot_runs', workspace));
    if (req.method === 'GET' && url.pathname === '/api/sync-operations') return send(res, 200, listForWorkspace('sync_operations', workspace));
    send(res, 404, { error: 'المسار غير موجود.' });
  } catch (error) {
    send(res, 500, { error: 'خطأ داخلي في Backend.', detail: error.message });
  }
});

server.listen(PORT, () => console.log(`Mahd backend listening on http://localhost:${PORT}`));
