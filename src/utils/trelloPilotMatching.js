export const PILOT_BOARD_SHORT_LINK = '3QDjP1P2';

export const PILOT_CLIENT_PROJECTS = Object.freeze([
  {
    clientId: 'thabat',
    clientName: 'ثبات',
    clientLabel: 'THB - ثبات',
    projectId: 'thabat-content-calendar',
    projectName: 'تقويم تحريري وخطة محتوى',
    projectType: 'تقويم تحريري وخطة محتوى',
  },
  {
    clientId: 'baraka-auction',
    clientName: 'مزاد بركة',
    clientLabel: 'BRK - مزاد بركة',
    projectId: 'baraka-brand-strategy',
    projectName: 'استراتيجية العلامة',
    projectType: 'استراتيجية العلامة',
  },
]);

const TEMPLATE_LIST_NAMES = new Set(['قوالب المهام']);

function normalizedText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/\s+/g, ' ');
}

const PILOT_BY_LABEL = new Map(
  PILOT_CLIENT_PROJECTS.map((item) => [normalizedText(item.clientLabel), item])
);

export function trelloListIsPilotTemplate(listName) {
  return TEMPLATE_LIST_NAMES.has(normalizedText(listName));
}

export function readTrelloTaskLabels(task) {
  return Array.isArray(task?.externalMeta?.labels)
    ? task.externalMeta.labels.map((label) => String(label || '').trim()).filter(Boolean)
    : [];
}

/**
 * يصنف بطاقة Trello لإظهارها في معاينة Pilot فقط.
 * لا يكتب إلى Trello ولا يستنتج مشروعًا من اسم البطاقة أو القائمة.
 */
export function classifyTrelloTaskForPilot(task) {
  const labels = readTrelloTaskLabels(task);
  const listName = task?.externalMeta?.listName || null;

  if (trelloListIsPilotTemplate(listName)) {
    return {
      kind: 'excluded',
      reason: 'template_list',
      reasonLabel: 'البطاقة موجودة في قائمة قوالب المهام',
      labels,
      listName,
    };
  }

  const recognized = labels
    .map((label) => ({ label, mapping: PILOT_BY_LABEL.get(normalizedText(label)) }))
    .filter((item) => item.mapping);

  if (recognized.length === 1) {
    const { label, mapping } = recognized[0];
    return {
      kind: 'matched',
      reason: 'pilot_client_label',
      reasonLabel: 'تمت المطابقة من Label العميل',
      labels,
      listName,
      clientLabel: label,
      client: mapping.clientName,
      clientId: mapping.clientId,
      project: mapping.projectName,
      projectId: mapping.projectId,
      projectType: mapping.projectType,
      projectAssignment: 'pilot_one_project_per_client',
    };
  }

  if (recognized.length > 1) {
    return {
      kind: 'manual_review',
      reason: 'multiple_pilot_client_labels',
      reasonLabel: 'البطاقة تحمل أكثر من Label لعميل Pilot',
      labels,
      listName,
      conflictingClientLabels: recognized.map((item) => item.label),
    };
  }

  return {
    kind: 'excluded',
    reason: labels.length ? 'no_pilot_client_label' : 'missing_client_label',
    reasonLabel: labels.length ? 'لا تحمل البطاقة Label عميل Pilot' : 'لا تحمل البطاقة أي Label عميل',
    labels,
    listName,
  };
}

function toMatchRecord(task) {
  return {
    task,
    classification: classifyTrelloTaskForPilot(task),
  };
}

/**
 * يبني تقريرًا قابلًا للعرض من Tasks المحملة أصلًا من Board واحد.
 * لا يغير ترتيب Tasks أو مصدر الحقيقة في Trello.
 */
export function buildPilotTrelloMatchReport(tasks) {
  const records = (Array.isArray(tasks) ? tasks : []).map(toMatchRecord);
  const matched = records.filter((item) => item.classification.kind === 'matched');
  const review = records.filter((item) => item.classification.kind === 'manual_review');
  const excluded = records.filter((item) => item.classification.kind === 'excluded');

  const byClient = PILOT_CLIENT_PROJECTS.map((mapping) => ({
    ...mapping,
    taskCount: matched.filter((item) => item.classification.clientId === mapping.clientId).length,
  }));

  return {
    total: records.length,
    matched,
    review,
    excluded,
    byClient,
    coveragePercent: records.length ? Math.round((matched.length / records.length) * 100) : 0,
  };
}

export function pilotMatchReasonLabel(reason) {
  return {
    template_list: 'قالب غير تشغيلي',
    no_pilot_client_label: 'Label عميل Pilot غير موجود',
    missing_client_label: 'Label العميل مفقود',
    multiple_pilot_client_labels: 'أكثر من عميل Pilot',
    pilot_client_label: 'مطابق من Label العميل',
  }[reason] || 'غير معرّفة';
}
