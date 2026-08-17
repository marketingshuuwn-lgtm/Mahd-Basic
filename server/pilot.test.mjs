import test from 'node:test';
import assert from 'node:assert/strict';
import { createDatabase, closeDatabase } from './db.mjs';
import { hasPermission } from './permissions.mjs';

test('يحفظ مخطط Pilot هوية المنفذ وbaseline ووقت الإكمال والبيانات الوصفية', () => {
  const db = createDatabase(':memory:');
  const runColumns = new Set(db.prepare('PRAGMA table_info(pilot_runs)').all().map((column) => column.name));
  const eventColumns = new Set(db.prepare('PRAGMA table_info(pilot_events)').all().map((column) => column.name));
  assert.equal(runColumns.has('actor_user_id'), true);
  assert.equal(runColumns.has('baseline_json'), true);
  assert.equal(runColumns.has('completed_at'), true);
  assert.equal(eventColumns.has('actor_user_id'), true);
  assert.equal(eventColumns.has('metadata_json'), true);
  closeDatabase(db);
});

test('يقصر إنشاء Pilot على الأدوار الإدارية المناسبة ويسمح للمنفذ بتسجيل الحدث', () => {
  assert.equal(hasPermission({ role: 'owner', status: 'active' }, 'create_pilot_runs'), true);
  assert.equal(hasPermission({ role: 'project_manager', status: 'active' }, 'create_pilot_runs'), true);
  assert.equal(hasPermission({ role: 'content_writer', status: 'active' }, 'create_pilot_runs'), false);
  assert.equal(hasPermission({ role: 'content_writer', status: 'active' }, 'record_pilot_events'), true);
});
