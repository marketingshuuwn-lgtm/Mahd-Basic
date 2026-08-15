import { ROLE_IDS } from './mahdRoles.js';

export const SYNC_ACTIONS = [
  { id: 'approve_sync', name: 'اعتماد عملية مزامنة' },
  { id: 'execute_sync', name: 'تنفيذ عملية معتمدة' },
  { id: 'resolve_conflict', name: 'حل تعارض' },
];

const activeOwnerPermissions = {
  approve_sync: 'active',
  execute_sync: 'active',
  resolve_conflict: 'active',
};

export const PERMISSION_MATRIX = Object.fromEntries(
  ROLE_IDS.map((roleId) => [
    roleId,
    roleId === 'owner'
      ? { status: 'active', permissions: activeOwnerPermissions }
      : { status: 'not_decided', permissions: { approve_sync: 'not_decided', execute_sync: 'not_decided', resolve_conflict: 'not_decided' } },
  ])
);

export function getRolePermissionStatus(roleId, actionId) {
  return PERMISSION_MATRIX[roleId]?.permissions?.[actionId] || 'not_decided';
}

export function describePermissionMatrix() {
  return {
    actions: SYNC_ACTIONS,
    activeRoles: Object.entries(PERMISSION_MATRIX).filter(([, value]) => value.status === 'active').map(([roleId]) => roleId),
    undecidedRoles: Object.entries(PERMISSION_MATRIX).filter(([, value]) => value.status === 'not_decided').map(([roleId]) => roleId),
    note: 'المصفوفة تسجل ما هو مفعل وما يحتاج قرارًا؛ لا تمنح صلاحيات إضافية للأدوار غير المحسومة.',
  };
}
