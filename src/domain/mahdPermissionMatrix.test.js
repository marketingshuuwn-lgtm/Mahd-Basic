import test from 'node:test';
import assert from 'node:assert/strict';
import { describePermissionMatrix, getRolePermissionStatus, PERMISSION_MATRIX, SYNC_ACTIONS } from './mahdPermissionMatrix.js';
import { ROLE_IDS } from './mahdRoles.js';

test('يغطي جدول الصلاحيات الأدوار التسعة وكل إجراءات المزامنة', () => {
  assert.deepEqual(Object.keys(PERMISSION_MATRIX).sort(), [...ROLE_IDS].sort());
  for (const role of ROLE_IDS) {
    for (const action of SYNC_ACTIONS) assert.ok(getRolePermissionStatus(role, action.id));
  }
});

test('يبقي المالك مفعلًا وبقية الأدوار غير محسومة', () => {
  assert.equal(getRolePermissionStatus('owner', 'approve_sync'), 'active');
  assert.equal(getRolePermissionStatus('owner', 'execute_sync'), 'active');
  assert.equal(getRolePermissionStatus('owner', 'resolve_conflict'), 'active');
  assert.equal(getRolePermissionStatus('project_manager', 'approve_sync'), 'not_decided');
  assert.equal(getRolePermissionStatus('account_manager', 'resolve_conflict'), 'not_decided');
});

test('يلخص الجدول الأدوار النشطة وغير المحسومة دون منح ضمني', () => {
  const summary = describePermissionMatrix();
  assert.deepEqual(summary.activeRoles, ['owner']);
  assert.equal(summary.undecidedRoles.length, 8);
});
