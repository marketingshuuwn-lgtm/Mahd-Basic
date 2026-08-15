import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient,
  createProject,
  createSyncOperation,
  createTask,
  validateTaskRelationship,
} from './mahdModel.js';

test('ينشئ عميلًا ومشروعًا ومهمة بعلاقات صريحة', () => {
  const client = createClient({ id: 'client-sanam', name: 'سنام', now: '2026-08-15T00:00:00.000Z' });
  const project = createProject({ id: 'project-sanam', clientId: client.id, name: 'خدمات تشغيلية شهرية + حملة ترويجية', type: 'monthly-operations-campaign', now: '2026-08-15T00:00:00.000Z' });
  const task = createTask({ id: 'task-1', clientId: client.id, projectId: project.id, title: 'مراجعة خطة الحملة', now: '2026-08-15T00:00:00.000Z' });
  assert.equal(validateTaskRelationship(task, { clients: [client], projects: [project] }).valid, true);
  assert.equal(task.syncStatus, 'local_only');
});

test('يمنع إنشاء مهمة خارج مشروع أو مسار داخلي', () => {
  assert.throws(() => createTask({ title: 'مهمة بلا سياق' }), /مشروعًا أو مسار عمل داخلي/);
  assert.throws(() => createTask({ projectId: 'project-1', title: 'مهمة بلا عميل' }), /تحتاج عميلًا/);
});

test('يسمح بمهمة العمل الداخلي دون عميل أو مشروع', () => {
  const task = createTask({ id: 'task-internal', title: 'تنظيم ملفات الوكالة', internalWorkstream: 'علامة الأم' });
  assert.equal(validateTaskRelationship(task).valid, true);
  assert.equal(task.clientId, null);
});

test('يمنع ربط مهمة بمشروع تابع لعميل آخر', () => {
  const clientA = createClient({ id: 'client-a', name: 'ثبات' });
  const clientB = createClient({ id: 'client-b', name: 'مزاد بركة' });
  const project = createProject({ id: 'project-a', clientId: clientA.id, name: 'مشروع أ' });
  const task = createTask({ id: 'task-cross', clientId: clientB.id, projectId: project.id, title: 'ربط غير صحيح' });
  const result = validateTaskRelationship(task, { clients: [clientA, clientB], projects: [project] });
  assert.equal(result.valid, false);
  assert.match(result.reason, /لا ينتميان/);
});

test('يبدأ سجل المزامنة في المعاينة ولا ينفذ تلقائيًا', () => {
  const operation = createSyncOperation({ entityType: 'task', entityId: 'task-1', operation: 'create' });
  assert.equal(operation.status, 'pending_preview');
  assert.equal(operation.approvedAt, null);
  assert.equal(operation.executedAt, null);
});
