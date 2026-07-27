export function createSubtask(title = '') {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    title: String(title || '').trim(),
    completed: false,
    sortOrder: 0,
  };
}

export function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];

  return subtasks
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `sub-${index}-${item}`,
          title: item.trim(),
          completed: false,
          sortOrder: index,
        };
      }

      return {
        id: item?.id || `sub-${index}-${Date.now()}`,
        title: String(item?.title || '').trim(),
        completed: !!item?.completed,
        sortOrder: Number.isFinite(Number(item?.sortOrder ?? item?.sort_order))
          ? Number(item?.sortOrder ?? item?.sort_order)
          : index,
      };
    })
    .filter((item) => item.title)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function getSubtaskStats(subtasks) {
  const normalized = normalizeSubtasks(subtasks);
  const total = normalized.length;
  const completed = normalized.filter((item) => item.completed).length;
  return {
    total,
    completed,
    pending: total - completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
