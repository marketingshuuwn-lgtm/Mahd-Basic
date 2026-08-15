import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENCY_ROLES, describeRoleBoundary, getAgencyRole, isKnownAgencyRole } from './mahdRoles.js';

test('يثبت قاموس التشغيل الأدوار التسعة المطلوبة', () => {
  assert.equal(AGENCY_ROLES.length, 9);
  assert.equal(getAgencyRole('owner').name, 'المالك');
  assert.equal(getAgencyRole('project_manager').name, 'مدير مشاريع');
  assert.equal(getAgencyRole('campaign_executor').name, 'منفذ حملات');
});

test('يميز بين دور معروف ودور غير معتمد', () => {
  assert.equal(isKnownAgencyRole('designer'), true);
  assert.equal(isKnownAgencyRole('unknown_role'), false);
});

test('يبقي مصفوفة الصلاحيات النهائية منفصلة عن قاموس الأدوار', () => {
  const boundary = describeRoleBoundary();
  assert.equal(boundary.roleCount, 9);
  assert.equal(boundary.permissionsStatus, 'not-finalized');
});
