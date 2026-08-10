export const WEEK_DAYS = [
  { id: 0, label: 'أحد', longLabel: 'الأحد' },
  { id: 1, label: 'إثنين', longLabel: 'الإثنين' },
  { id: 2, label: 'ثلاثاء', longLabel: 'الثلاثاء' },
  { id: 3, label: 'أربعاء', longLabel: 'الأربعاء' },
  { id: 4, label: 'خميس', longLabel: 'الخميس' },
  { id: 5, label: 'جمعة', longLabel: 'الجمعة' },
  { id: 6, label: 'سبت', longLabel: 'السبت' },
];

export const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4];
export const ALL_WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** وضع عرض كل المساحات (ليس context في قاعدة البيانات) */
export const ALL_WORKSPACES_ID = '__all__';

/** مساحة مهام تريلو الافتراضية */
export const TRELLO_WORKSPACE_ID = 'alama';

/**
 * تسميات معروفة — لا تُفرض على مساحات المستخدم إن وُجدت تسمية محفوظة.
 * تُستخدم فقط عند إنشاء صف افتراضي ناقص أو استعادة من context المهام.
 */
export const WORKSPACE_LABEL_HINTS = {
  work: 'مشاريعي',
  personal: 'شخصي',
  [TRELLO_WORKSPACE_ID]: 'علامة',
  trello: 'تريلو',
  alama: 'علامة',
};

/** المساحات الافتراضية في التثبيت النظيف فقط */
export const DEFAULT_WORKSPACES = [
  {
    id: 'work',
    label: WORKSPACE_LABEL_HINTS.work,
    icon: 'ph-briefcase',
    color: 'var(--accent)',
    bg: 'var(--accent-light)',
    isDefault: true,
  },
  {
    id: 'personal',
    label: WORKSPACE_LABEL_HINTS.personal,
    icon: 'ph-house-line',
    color: 'var(--success)',
    bg: 'var(--success-light)',
    isDefault: true,
  },
  {
    id: TRELLO_WORKSPACE_ID,
    label: WORKSPACE_LABEL_HINTS[TRELLO_WORKSPACE_ID],
    icon: 'ph-kanban',
    color: '#0079bf',
    bg: 'rgba(0, 121, 191, 0.12)',
    isDefault: true,
    trait: 'مهام تريلو',
  },
];

/** للتوافق مع الكود القديم */
export const TASK_CONTEXTS = DEFAULT_WORKSPACES;

export const WORKSPACE_COLORS = [
  { color: 'var(--accent)', bg: 'var(--accent-light)', name: 'أخضر مهد' },
  { color: 'var(--success)', bg: 'var(--success-light)', name: 'أخضر هادئ' },
  { color: 'var(--warning)', bg: 'var(--warning-light)', name: 'كهرماني' },
  { color: 'var(--danger)', bg: 'var(--danger-light)', name: 'أحمر' },
  { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.12)', name: 'بنفسجي' },
  { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.12)', name: 'سماوي' },
  { color: '#db2777', bg: 'rgba(219, 39, 119, 0.12)', name: 'وردي' },
  { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.12)', name: 'برتقالي' },
  { color: '#0079bf', bg: 'rgba(0, 121, 191, 0.12)', name: 'تريلو' },
  { color: '#0f766e', bg: 'rgba(15, 118, 110, 0.12)', name: 'تركوازي' },
  { color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)', name: 'نيلي' },
  { color: '#64748b', bg: 'rgba(100, 116, 139, 0.14)', name: 'رمادي' },
];

export const WORKSPACE_ICONS = [
  'ph-briefcase',
  'ph-house-line',
  'ph-kanban',
  'ph-book-open',
  'ph-folder',
  'ph-star',
  'ph-heart',
  'ph-target',
  'ph-lightbulb',
  'ph-users',
  'ph-code',
  'ph-palette',
  'ph-rocket-launch',
  'ph-graduation-cap',
  'ph-leaf',
  'ph-music-notes',
  'ph-camera',
  'ph-chart-line-up',
  'ph-handshake',
  'ph-sparkle',
];

/**
 * مساحات النظام — لا تُؤرشف ولا تُحذف.
 * مشاريعي / شخصي / علامة (تريلو) + أي isDefault.
 */
export function isSystemWorkspace(wsOrId) {
  if (wsOrId == null) return true;
  const id = typeof wsOrId === 'string' ? wsOrId : wsOrId.id;
  const ws = typeof wsOrId === 'object' ? wsOrId : null;
  if (ws?.isDefault) return true;
  if (!id || typeof id !== 'string') return false;
  const nid = id.trim().toLowerCase();
  return (
    nid === 'work' ||
    nid === 'personal' ||
    nid === TRELLO_WORKSPACE_ID ||
    nid === 'alama' ||
    nid === 'trello' ||
    nid === 'علامة'
  );
}

export function normalizeWorkDays(days) {
  const source = Array.isArray(days) ? days : DEFAULT_WORK_DAYS;
  const unique = [...new Set(source.map(Number).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b);
  return unique.length > 0 ? unique : DEFAULT_WORK_DAYS;
}

export function formatWorkDays(days, { long = false } = {}) {
  const normalized = normalizeWorkDays(days);
  return normalized
    .map((dayId) => {
      const day = WEEK_DAYS.find((d) => d.id === dayId);
      return long ? day?.longLabel : day?.label;
    })
    .filter(Boolean)
    .join('، ');
}

/** أي نص غير فارغ = معرف مساحة صالح؛ الفارغ/null → work */
export function normalizeTaskContext(context) {
  if (typeof context === 'string' && context.trim()) return context.trim();
  return 'work';
}

export function getTaskContextMeta(context, workspaces = null) {
  const id = normalizeTaskContext(context);
  const list = Array.isArray(workspaces) && workspaces.length > 0 ? workspaces : DEFAULT_WORKSPACES;
  const found = list.find((item) => item.id === id);
  if (found) return found;
  const hint = WORKSPACE_LABEL_HINTS[id];
  return {
    id,
    label: hint || id,
    icon: id === TRELLO_WORKSPACE_ID || id === 'trello' ? 'ph-kanban' : 'ph-folder',
    color: id === TRELLO_WORKSPACE_ID || id === 'trello' ? '#0079bf' : 'var(--accent)',
    bg:
      id === TRELLO_WORKSPACE_ID || id === 'trello'
        ? 'rgba(0, 121, 191, 0.12)'
        : 'var(--accent-light)',
  };
}

export function slugifyWorkspaceName(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0600-\u06FF-]/g, '')
    .slice(0, 40);
  return base || `ws-${Date.now().toString(36)}`;
}

/** يبني مساحة من معرف context إن لم تكن في القائمة */
export function workspaceFromContextId(id, index = 0) {
  const nid = normalizeTaskContext(id);
  const def = DEFAULT_WORKSPACES.find((w) => w.id === nid);
  if (def) return { ...def, archived: false, trait: def.trait || '', description: '' };
  const palette = WORKSPACE_COLORS[index % WORKSPACE_COLORS.length];
  const isTrello = nid === 'trello' || nid === TRELLO_WORKSPACE_ID;
  return {
    id: nid,
    label: WORKSPACE_LABEL_HINTS[nid] || nid,
    icon: isTrello ? 'ph-kanban' : WORKSPACE_ICONS[index % WORKSPACE_ICONS.length],
    color: isTrello ? '#0079bf' : palette.color,
    bg: isTrello ? 'rgba(0, 121, 191, 0.12)' : palette.bg,
    isDefault: false,
    archived: false,
    trait: isTrello ? 'مهام تريلو' : '',
    description: '',
  };
}
