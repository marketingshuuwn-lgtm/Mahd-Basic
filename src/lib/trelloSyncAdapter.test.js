import test from 'node:test';
import assert from 'node:assert/strict';
import { assertApprovedWrite, buildTrelloWritePlan } from './trelloSyncAdapter.js';

test('يخطط لإنشاء مهمة كبطاقة في القائمة المحددة', () => {
  const plan = buildTrelloWritePlan(
    { entityType: 'task', operation: 'create', payload: { title: 'مهمة جديدة', description: 'وصف', dueDate: '2026-08-20' } },
    { defaultListId: 'list-todo' }
  );
  assert.equal(plan.supported, true);
  assert.equal(plan.target.listId, 'list-todo');
  assert.equal(plan.requiresApproval, true);
});

test('يرفض التنفيذ قبل حالة الاعتماد وهوية المعتمد', () => {
  const operation = { entityType: 'task', operation: 'create', status: 'pending_approval', payload: { title: 'مهمة' } };
  const plan = buildTrelloWritePlan(operation, { defaultListId: 'list-todo' });
  assert.throws(() => assertApprovedWrite(operation, plan, { approvedBy: 'owner-1' }), /قبل اعتماد/);
  assert.throws(() => assertApprovedWrite({ ...operation, status: 'approved' }, plan), /هوية صاحب الموافقة/);
});

test('يبقي إنشاء العميل والمشروع غير ممثلين ضمن مراجعة صريحة', () => {
  for (const entityType of ['client', 'project']) {
    const plan = buildTrelloWritePlan({ entityType, operation: 'create', payload: { name: 'عنصر جديد' } });
    assert.equal(plan.supported, false);
    assert.match(plan.reason, /خريطة كتابة صريحة/);
  }
});

test('يحتاج تحديث المهمة إلى معرّف Trello خارجي', () => {
  const plan = buildTrelloWritePlan({ entityType: 'task', operation: 'update', payload: { title: 'تعديل' } });
  assert.equal(plan.supported, false);
  const linked = buildTrelloWritePlan({ entityType: 'task', operation: 'update', payload: { externalId: 'card-1', title: 'تعديل' } });
  assert.equal(linked.supported, true);
});
