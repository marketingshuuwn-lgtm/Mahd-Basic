const STATUS_RULES = [
  { status: 'completed', names: ['done', 'منجز', 'مكتمل', 'مكتملة', 'تم'] },
  { status: 'in_progress', names: ['doing', 'قيد التنفيذ', 'جاري التنفيذ', 'في التنفيذ'] },
  { status: 'in_progress', names: ['للمراجعة', 'مراجعة', 'review'] },
  { status: 'not_started', names: ['to do', 'todo', 'بانتظار البدء', 'لم تبدأ', 'قائمة الانتظار'] },
];

function normalizeListName(name) {
  return String(name || '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/\s+/g, ' ');
}

export function statusFromTrelloListName(listName) {
  const normalized = normalizeListName(listName);
  const rule = STATUS_RULES.find((entry) => entry.names.some((name) => normalizeListName(name) === normalized));
  return rule?.status || null;
}

export function findTrelloListForStatus(lists, status) {
  const target = (lists || []).find((list) => statusFromTrelloListName(list.name) === status);
  return target || null;
}

export function getTrelloWorkflowSummary(lists) {
  return (lists || [])
    .map((list) => ({
      id: list.id,
      name: list.name,
      status: statusFromTrelloListName(list.name),
    }))
    .filter((list) => list.status);
}

export function trelloStatusLabel(status) {
  return (
    {
      not_started: 'لم تبدأ',
      in_progress: 'قيد التنفيذ',
      completed: 'منجزة',
    }[status] || 'غير معيّنة'
  );
}
