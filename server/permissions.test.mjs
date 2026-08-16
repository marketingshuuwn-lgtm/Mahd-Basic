import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENCY_ROLE_IDS, describeServerPermissionMatrix, hasPermission, isKnownRole, permissionForEntity } from './permissions.mjs';

const active = (role) => ({ role, status: 'active' });

test('يغطي جدول الصلاحيات الخادمي الأدوار التسعة المعتمدة', () => {
  const matrix = describeServerPermissionMatrix();
  assert.deepEqual(Object.keys(matrix).sort(), [...AGENCY_ROLE_IDS].sort());
  assert.equal(AGENCY_ROLE_IDS.length, 9);
});

test('يحصر إدارة الأعضاء والعمل الداخلي ومزامنة Trello في المالك', () => {
  for (const role of AGENCY_ROLE_IDS) {
    assert.equal(hasPermission(active(role), 'manage_members'), role === 'owner');
    assert.equal(hasPermission(active(role), 'read_internal_work'), role === 'owner' || role === 'project_manager');
    assert.equal(hasPermission(active(role), 'approve_sync'), role === 'owner');
    assert.equal(hasPermission(active(role), 'execute_sync'), role === 'owner');
    assert.equal(hasPermission(active(role), 'resolve_conflict'), role === 'owner');
  }
});

test('يمنح الأدوار النشطة صلاحيات القراءة والتشغيل وفق نطاقها', () => {
  assert.equal(hasPermission(active('content_writer'), 'read_tasks'), true);
  assert.equal(hasPermission(active('content_writer'), permissionForEntity('tasks', 'create')), true);
  assert.equal(hasPermission(active('content_writer'), permissionForEntity('clients', 'create')), false);
  assert.equal(hasPermission(active('account_manager'), permissionForEntity('clients', 'create')), true);
  assert.equal(hasPermission(active('project_coordinator'), permissionForEntity('projects', 'create')), true);
});

test('يرفض العضوية غير النشطة والدور غير المعروف', () => {
  assert.equal(isKnownRole('member'), false);
  assert.equal(hasPermission({ role: 'member', status: 'active' }, 'read_tasks'), false);
  assert.equal(hasPermission({ role: 'owner', status: 'suspended' }, 'read_tasks'), false);
  assert.equal(hasPermission(null, 'read_tasks'), false);
});
