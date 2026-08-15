export const PILOT_BOARD_SHORT_LINK = '3QDjP1P2';
export const PILOT_BOARD_ID = '6a7e0e3e48a317dd981a35e0';

export const TRELLO_CLIENTS = Object.freeze([
  {
    clientId: 'thabat',
    clientName: 'ثبات',
    clientLabel: 'THB - ثبات',
    projectId: 'thabat-content-calendar',
    projectName: 'تقويم تحريري وخطة محتوى',
    projectType: 'تقويم تحريري وخطة محتوى',
    projectAssignment: 'pilot_one_project_per_client',
  },
  {
    clientId: 'baraka-auction',
    clientName: 'مزاد بركة',
    clientLabel: 'BRK - مزاد بركة',
    projectId: 'baraka-brand-strategy',
    projectName: 'استراتيجية العلامة',
    projectType: 'استراتيجية العلامة',
    projectAssignment: 'pilot_one_project_per_client',
  },
  {
    clientId: 'sanam',
    clientName: 'سنام',
    clientLabel: 'SNM - سنام',
    projectId: null,
    projectName: null,
    projectType: null,
    projectAssignment: 'requires_project_assignment',
  },
  {
    clientId: 'marketing-brand',
    clientName: 'علامة تسويق',
    clientLabel: 'ALM - علامة تسويق',
    projectId: null,
    projectName: null,
    projectType: null,
    projectAssignment: 'requires_project_assignment',
  },
]);

export const TRELLO_INTERNAL_STREAMS = Object.freeze([
  {
    streamId: 'mother-brand-operations',
    streamName: 'علامة الأم',
    streamLabel: 'ALH - علامة الأم',
    category: 'إداري وتنظيمي داخلي',
  },
]);

const TEMPLATE_LIST_NAMES = new Set(['قوالب المهام']);

function normalizedText(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('ar')
    .replace(/\s+/g, ' ');
}

const CLIENT_BY_LABEL = new Map(
  TRELLO_CLIENTS.map((item) => [normalizedText(item.clientLabel), item])
);
const INTERNAL_BY_LABEL = new Map(
  TRELLO_INTERNAL_STREAMS.map((item) => [normalizedText(item.streamLabel), item])
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
 * يصنف بطاقة Trello عند القراءة فقط. لا يكتب إلى Trello ولا يخمن مشروعًا
 * لعميل لا يملك مشروعًا معتمدًا في Pilot.
 */
export function classifyTrelloTaskForPilot(task) {
  const labels = readTrelloTaskLabels(task);
  const listName = task?.externalMeta?.listName || null;

  if (trelloListIsPilotTemplate(listName)) {
    return {
      kind: 'template',
      route: 'library_templates',
      reason: 'template_list',
      reasonLabel: 'البطاقة موجودة في قائمة قوالب المهام',
      labels,
      listName,
    };
  }

  const recognizedClients = labels
    .map((label) => ({ label, mapping: CLIENT_BY_LABEL.get(normalizedText(label)) }))
    .filter((item) => item.mapping);
  const recognizedInternal = labels
    .map((label) => ({ label, mapping: INTERNAL_BY_LABEL.get(normalizedText(label)) }))
    .filter((item) => item.mapping);

  if (recognizedClients.length + recognizedInternal.length > 1) {
    return {
      kind: 'manual_review',
      route: 'review',
      reason: 'multiple_known_routes',
      reasonLabel: 'البطاقة تحمل أكثر من تصنيف معروف',
      labels,
      listName,
      conflictingLabels: [...recognizedClients, ...recognizedInternal].map((item) => item.label),
    };
  }

  if (recognizedClients.length === 1) {
    const { label, mapping } = recognizedClients[0];
    return {
      kind: 'client',
      route: 'client',
      reason: mapping.projectId ? 'pilot_client_label' : 'client_project_unassigned',
      reasonLabel: mapping.projectId ? 'عميل ومشروع Pilot محددان' : 'عميل معروف ومشروعه غير معيّن بعد',
      labels,
      listName,
      clientLabel: label,
      client: mapping.clientName,
      clientId: mapping.clientId,
      project: mapping.projectName,
      projectId: mapping.projectId,
      projectType: mapping.projectType,
      projectAssignment: mapping.projectAssignment,
      requiresProjectAssignment: !mapping.projectId,
    };
  }

  if (recognizedInternal.length === 1) {
    const { label, mapping } = recognizedInternal[0];
    return {
      kind: 'internal',
      route: 'internal_work',
      reason: 'internal_work_label',
      reasonLabel: 'عمل إداري وتنظيمي داخلي',
      labels,
      listName,
      streamLabel: label,
      stream: mapping.streamName,
      streamId: mapping.streamId,
      category: mapping.category,
    };
  }

  return {
    kind: 'unclassified',
    route: 'review',
    reason: labels.length ? 'unknown_label' : 'missing_label',
    reasonLabel: labels.length ? 'Label غير معرّف في تصنيف مَهَد' : 'Label التصنيف مفقود',
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
  const client = records.filter((item) => item.classification.kind === 'client');
  const pilotMatched = client.filter((item) => item.classification.projectId);
  const clientNeedsProject = client.filter((item) => item.classification.requiresProjectAssignment);
  const internal = records.filter((item) => item.classification.kind === 'internal');
  const templates = records.filter((item) => item.classification.kind === 'template');
  const review = records.filter((item) => item.classification.kind === 'manual_review');
  const unclassified = records.filter((item) => item.classification.kind === 'unclassified');

  const byClient = TRELLO_CLIENTS.map((mapping) => ({
    ...mapping,
    taskCount: client.filter((item) => item.classification.clientId === mapping.clientId).length,
  }));
  const byInternalStream = TRELLO_INTERNAL_STREAMS.map((mapping) => ({
    ...mapping,
    taskCount: internal.filter((item) => item.classification.streamId === mapping.streamId).length,
  }));

  return {
    total: records.length,
    client,
    pilotMatched,
    clientNeedsProject,
    internal,
    templates,
    review,
    unclassified,
    byClient,
    byInternalStream,
    classifiedPercent: records.length ? Math.round(((client.length + internal.length + templates.length + review.length) / records.length) * 100) : 0,
  };
}

export function pilotMatchReasonLabel(reason) {
  return {
    template_list: 'قالب غير تشغيلي',
    client_project_unassigned: 'عميل معروف ومشروع غير معيّن',
    pilot_client_label: 'عميل ومشروع Pilot محددان',
    internal_work_label: 'عمل داخلي',
    unknown_label: 'Label غير معرّف',
    missing_label: 'Label مفقود',
    multiple_known_routes: 'أكثر من تصنيف معروف',
  }[reason] || 'غير معرّفة';
}
