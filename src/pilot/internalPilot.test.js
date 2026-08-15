import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClient,
  createProject,
  createTask,
  createSyncOperation,
  validateTaskRelationship,
} from '../domain/mahdModel.js';
import { assertApprovedWrite, buildTrelloWritePlan } from '../lib/trelloSyncAdapter.js';

function createPilotStore() {
  const records = new Map();
  return {
    save(record) {
      records.set(record.id, structuredClone(record));
      return structuredClone(record);
    },
    load(id) {
      return structuredClone(records.get(id));
    },
    size() {
      return records.size;
    },
  };
}

test('Pilot داخلي: ينشئ عميل مستر آرت ومشروع التأسيس ومهمة مترابطة', () => {
  const store = createPilotStore();
  const client = createClient({ id: 'client-mr-art', name: 'مستر آرت', description: 'سياق عميل Pilot' });
  const project = createProject({ id: 'project-mr-art-foundation', clientId: client.id, name: 'التأسيس', type: 'brand-strategy' });
  const task = createTask({
    id: 'task-mr-art-brand-strategy',
    clientId: client.id,
    projectId: project.id,
    title: 'استراتيجية العلامة',
    assigneeId: 'account-manager',
    dueDate: '2026-08-20',
  });

  [client, project, task].forEach((record) => store.save(record));
  assert.equal(store.size(), 3);
  assert.deepEqual(validateTaskRelationship(task, { clients: [client], projects: [project] }), { valid: true, reason: null });
  assert.equal(store.load(task.id).projectId, project.id);
  assert.equal(store.load(task.id).clientId, client.id);
  assert.equal(store.load(task.id).assigneeId, 'account-manager');
});

test('Pilot داخلي: يستعيد الكيانات بعد التخزين المحلي دون فقد العلاقة', () => {
  const store = createPilotStore();
  const client = createClient({ id: 'client-sanam', name: 'سنام' });
  const project = createProject({ id: 'project-sanam-operations', clientId: client.id, name: 'خدمات تشغيلية شهرية + حملة ترويجية', type: 'monthly-operations-campaign' });
  const task = createTask({ id: 'task-sanam-calendar', clientId: client.id, projectId: project.id, title: 'إعداد تقويم الحملة' });
  [client, project, task].forEach((record) => store.save(record));

  const restoredClient = store.load(client.id);
  const restoredProject = store.load(project.id);
  const restoredTask = store.load(task.id);
  assert.equal(restoredProject.clientId, restoredClient.id);
  assert.equal(restoredTask.projectId, restoredProject.id);
  assert.equal(restoredTask.clientId, restoredClient.id);
});

test('Pilot داخلي: يوقف الإرسال قبل الاعتماد ولا يستدعي Trello', () => {
  const task = createTask({ id: 'task-pilot-guard', clientId: 'client-mr-art', projectId: 'project-mr-art-foundation', title: 'اختبار الحارس' });
  const operation = createSyncOperation({ entityType: 'task', entityId: task.id, operation: 'create', payload: { title: task.title, description: 'اختبار داخلي' }, status: 'pending_approval' });
  const plan = buildTrelloWritePlan(operation, { defaultListId: 'pilot-list-todo' });

  assert.equal(plan.supported, true);
  assert.equal(plan.requiresApproval, true);
  assert.throws(() => assertApprovedWrite(operation, plan, { approvedBy: 'pilot-owner' }), /قبل اعتماد/);
  assert.equal(operation.status, 'pending_approval');
});

test('Pilot داخلي: يسمح بالتنفيذ النظري فقط بعد اعتماد وهوية معتمدة', () => {
  const operation = createSyncOperation({ entityType: 'task', entityId: 'task-pilot-approved', operation: 'create', payload: { title: 'عملية معتمدة' }, status: 'approved' });
  const plan = buildTrelloWritePlan(operation, { defaultListId: 'pilot-list-todo' });
  assert.equal(assertApprovedWrite(operation, plan, { approvedBy: 'pilot-owner' }), true);
});
