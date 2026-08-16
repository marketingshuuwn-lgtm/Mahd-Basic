export const AGENCY_ROLE_IDS = Object.freeze([
  'owner',
  'account_manager',
  'content_writer',
  'designer',
  'photographer',
  'media_manager',
  'project_coordinator',
  'project_manager',
  'campaign_executor',
]);

const READ_ALL = [
  'read_clients',
  'read_projects',
  'read_tasks',
  'read_deliverables',
];

const ROLE_PERMISSIONS = {
  owner: new Set([
    'manage_members',
    'read_internal_work',
    'create_internal_work',
    'read_pilot_runs',
    'read_sync_operations',
    'approve_sync',
    'execute_sync',
    'resolve_conflict',
    'create_clients',
    'create_projects',
    'create_tasks',
    'create_deliverables',
    ...READ_ALL,
  ]),
  account_manager: new Set([...READ_ALL, 'create_clients', 'create_projects', 'create_tasks', 'create_deliverables']),
  content_writer: new Set([...READ_ALL, 'create_tasks', 'create_deliverables']),
  designer: new Set([...READ_ALL, 'create_tasks', 'create_deliverables']),
  photographer: new Set([...READ_ALL, 'create_tasks', 'create_deliverables']),
  media_manager: new Set([...READ_ALL, 'create_tasks', 'create_deliverables']),
  project_coordinator: new Set([...READ_ALL, 'create_projects', 'create_tasks', 'create_deliverables']),
  project_manager: new Set([...READ_ALL, 'create_projects', 'create_tasks', 'create_deliverables', 'read_internal_work', 'read_pilot_runs']),
  campaign_executor: new Set([...READ_ALL, 'create_tasks', 'create_deliverables']),
};

export function isKnownRole(role) {
  return AGENCY_ROLE_IDS.includes(role);
}

export function hasPermission(membership, permission) {
  if (!membership || membership.status !== 'active' || !isKnownRole(membership.role)) return false;
  return ROLE_PERMISSIONS[membership.role].has(permission);
}

export function permissionForEntity(entity, action) {
  const normalized = entity === 'internal-work' ? 'internal_work' : entity;
  return `${action}_${normalized}`;
}

export function describeServerPermissionMatrix() {
  return Object.fromEntries(Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => [role, [...permissions].sort()]));
}
