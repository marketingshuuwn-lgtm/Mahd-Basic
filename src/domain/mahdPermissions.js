export const PILOT_ACTOR = {
  id: 'owner-local-pilot',
  name: 'مالك مساحة مَهَد',
  role: 'owner',
};

const PILOT_SYNC_PERMISSIONS = {
  owner: new Set(['approve_sync', 'execute_sync', 'resolve_conflict']),
};

export function canPerformSyncAction(actor, action) {
  if (!actor?.role || !actor?.id) return false;
  return PILOT_SYNC_PERMISSIONS[actor.role]?.has(action) === true;
}

export function assertCanPerformSyncAction(actor, action) {
  if (!canPerformSyncAction(actor, action)) {
    throw new Error('لا تملك هذه الهوية صلاحية تنفيذ هذا القرار في Pilot الحالي.');
  }
  return true;
}

export function describePilotPermissionBoundary() {
  return {
    mode: 'pilot-local',
    actor: PILOT_ACTOR,
    approvedRoles: ['owner'],
    note: 'صلاحيات الأدوار التشغيلية التسعة لم تعتمد بعد كنظام وصول نهائي.',
  };
}
