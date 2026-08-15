import test from 'node:test';
import assert from 'node:assert/strict';
import { PILOT_ACTOR, assertCanPerformSyncAction, canPerformSyncAction, describePilotPermissionBoundary } from './mahdPermissions.js';

test('يسمح للمالك في Pilot بإجراءات صندوق المزامنة', () => {
  assert.equal(canPerformSyncAction(PILOT_ACTOR, 'approve_sync'), true);
  assert.equal(canPerformSyncAction(PILOT_ACTOR, 'execute_sync'), true);
  assert.equal(canPerformSyncAction(PILOT_ACTOR, 'resolve_conflict'), true);
  assert.equal(assertCanPerformSyncAction(PILOT_ACTOR, 'approve_sync'), true);
});

test('يرفض هوية بلا دور معتمد في Pilot الحالي', () => {
  const actor = { id: 'designer-1', name: 'مصمم', role: 'designer' };
  assert.equal(canPerformSyncAction(actor, 'approve_sync'), false);
  assert.throws(() => assertCanPerformSyncAction(actor, 'approve_sync'), /لا تملك/);
});

test('يوضح أن صلاحيات الأدوار النهائية لم تعتمد بعد', () => {
  const boundary = describePilotPermissionBoundary();
  assert.deepEqual(boundary.approvedRoles, ['owner']);
  assert.equal(boundary.mode, 'pilot-local');
});
