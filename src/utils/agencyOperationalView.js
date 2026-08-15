import { buildPilotTrelloMatchReport } from './trelloPilotMatching.js';

function formatDueDate(value) {
  if (!value) return 'بلا موعد';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'بلا موعد';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium' }).format(date);
}

function stageTone(listName) {
  if (String(listName).includes('منجز')) return 'success';
  if (String(listName).includes('مراجعة')) return 'warning';
  if (String(listName).includes('تنفيذ')) return 'warning';
  return 'neutral';
}

function toOperationalCard(record) {
  const { task, classification } = record;
  return {
    id: task.id,
    title: task.title,
    sourceUrl: task.externalUrl || null,
    listName: classification.listName || 'قائمة غير مسماة',
    dueLabel: formatDueDate(task.dueDate),
    completed: Boolean(task.completed),
    labels: classification.labels || [],
    kind: classification.kind,
    clientId: classification.clientId || null,
    client: classification.client || null,
    projectId: classification.projectId || null,
    project: classification.project || null,
    stream: classification.stream || null,
    reasonLabel: classification.reasonLabel,
    stageTone: stageTone(classification.listName),
  };
}

function sortCards(cards) {
  return [...cards].sort((left, right) => {
    if (left.completed !== right.completed) return Number(left.completed) - Number(right.completed);
    const leftDue = left.dueLabel === 'بلا موعد' ? '9999-12-31' : left.dueLabel;
    const rightDue = right.dueLabel === 'بلا موعد' ? '9999-12-31' : right.dueLabel;
    return String(leftDue).localeCompare(String(rightDue), 'ar');
  });
}

/**
 * يجهز بيانات مساحة الوكالة للعرض فقط فوق مهام Trello المحملة أو لقطة قراءة.
 * لا يعدل المهمة ولا يستدعي أي API.
 */
export function buildAgencyOperationalView(tasks, source) {
  const report = buildPilotTrelloMatchReport(tasks);
  const toCards = (records) => sortCards(records.map(toOperationalCard));

  return {
    source,
    report,
    clients: report.byClient.map((client) => ({
      ...client,
      cards: toCards(report.client.filter((item) => item.classification.clientId === client.clientId)),
    })),
    internal: toCards(report.internal),
    templates: toCards(report.templates),
    review: toCards([...report.review, ...report.unclassified]),
    clientCards: toCards(report.client),
    operationalCards: toCards([...report.client, ...report.internal]),
  };
}
