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

export const TASK_CONTEXTS = [
  {
    id: 'work',
    label: 'عمل',
    icon: 'ph-briefcase',
    color: 'var(--accent)',
    bg: 'var(--accent-light)',
  },
  {
    id: 'personal',
    label: 'شخصي',
    icon: 'ph-house-line',
    color: 'var(--success)',
    bg: 'var(--success-light)',
  },
];

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

export function getTaskContextMeta(context) {
  return TASK_CONTEXTS.find((item) => item.id === context) || TASK_CONTEXTS[0];
}

export function normalizeTaskContext(context) {
  return TASK_CONTEXTS.some((item) => item.id === context) ? context : 'work';
}
