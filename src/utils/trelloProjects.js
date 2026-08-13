export function trelloBoardToProject(board, activeBoardId = null) {
  if (!board?.id) return null;
  return {
    id: String(board.id),
    title: String(board.name || 'مشروع Trello').trim() || 'مشروع Trello',
    externalSource: 'trello',
    externalUrl: board.url || null,
    lastActivityAt: board.dateLastActivity || null,
    isActive: String(board.id) === String(activeBoardId || ''),
  };
}

export function trelloBoardsToProjects(boards, activeBoardId = null) {
  return (Array.isArray(boards) ? boards : [])
    .map((board) => trelloBoardToProject(board, activeBoardId))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return bTime - aTime || a.title.localeCompare(b.title, 'ar');
    });
}

export function formatProjectActivity(value) {
  if (!value) return 'لا توجد بيانات نشاط';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'لا توجد بيانات نشاط';
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
