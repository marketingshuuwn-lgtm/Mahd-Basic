import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createDatabase, closeDatabase } from './db.mjs';

function withDatabase(callback) {
  const db = createDatabase(':memory:');
  try { return callback(db); } finally { closeDatabase(db); }
}

test('ينشئ مخطط Backend الأساسي ومساحات العمل', () => {
  withDatabase((db) => {
    db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run('w1', 'وكالة', new Date().toISOString());
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM workspaces').get().count, 1);
  });
});

test('يفرض علاقات الكيانات داخل مساحة العمل', () => {
  withDatabase((db) => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?)').run('w1', 'وكالة', now);
    db.prepare('INSERT INTO clients (id, workspace_id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('c1', 'w1', 'مستر آرت', '', 'active', now, now);
    db.prepare('INSERT INTO projects (id, workspace_id, client_id, name, project_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('p1', 'w1', 'c1', 'التأسيس', 'branding', 'active', now, now);
    db.prepare('INSERT INTO tasks (id, workspace_id, client_id, project_id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('t1', 'w1', 'c1', 'p1', 'استراتيجية العلامة', 'todo', now, now);
    assert.equal(db.prepare('SELECT client_id FROM projects WHERE id = ?').get('p1').client_id, 'c1');
    assert.equal(db.prepare('SELECT project_id FROM tasks WHERE id = ?').get('t1').project_id, 'p1');
  });
});

test('يعزل القراءة حسب workspace_id', () => {
  withDatabase((db) => {
    const now = new Date().toISOString();
    db.prepare('INSERT INTO workspaces (id, name, created_at) VALUES (?, ?, ?), (?, ?, ?)').run('w1', 'أ', now, 'w2', 'ب', now);
    db.prepare('INSERT INTO clients (id, workspace_id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)').run('c1', 'w1', 'عميل أ', '', 'active', now, now, 'c2', 'w2', 'عميل ب', '', 'active', now, now);
    const visible = db.prepare('SELECT id FROM clients WHERE workspace_id = ? ORDER BY id').all('w1');
    assert.deepEqual(visible.map((row) => row.id), ['c1']);
  });
});
