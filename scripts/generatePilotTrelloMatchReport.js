import fs from 'node:fs';
import path from 'node:path';
import {
  TRELLO_CLIENTS,
  TRELLO_INTERNAL_STREAMS,
  classifyTrelloTaskForPilot,
} from '../src/utils/trelloPilotMatching.js';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Usage: node generatePilotTrelloMatchReport.js <input.json> <output.md>');
}

const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function stageFromListName(name) {
  const normalized = String(name || '').trim().toLocaleLowerCase('ar');
  if (['منجز', 'مكتمل', 'مكتملة', 'تم', 'done'].includes(normalized)) return 'منجزة';
  if (['قيد التنفيذ', 'جاري التنفيذ', 'في التنفيذ', 'للمراجعة', 'مراجعة', 'doing', 'review'].includes(normalized)) return 'قيد التنفيذ';
  if (['بانتظار البدء', 'لم تبدأ', 'قائمة الانتظار', 'to do', 'todo'].includes(normalized)) return 'لم تبدأ';
  return 'غير معيّنة';
}

function escapePipe(value) {
  return String(value || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function formatDate(value) {
  return new Date(value).toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Riyadh',
  });
}

const records = (source.lists || []).flatMap((list) =>
  (list.cards || []).map((card) => {
    const task = {
      id: card.id,
      title: card.name,
      dueDate: card.due?.date || null,
      completed: Boolean(card.closed),
      externalUrl: card.url || card.shortUrl || null,
      externalMeta: {
        labels: (card.labels || []).map((label) => label.name).filter(Boolean),
        listName: list.name || 'قائمة غير مسماة',
      },
    };
    return { task, classification: classifyTrelloTaskForPilot(task) };
  })
);

const kindCount = (kind) => records.filter((record) => record.classification.kind === kind).length;
const clientRecords = records.filter((record) => record.classification.kind === 'client');
const pilotRecords = clientRecords.filter((record) => record.classification.projectId);
const clientProjectPending = clientRecords.filter((record) => record.classification.requiresProjectAssignment);
const internalRecords = records.filter((record) => record.classification.kind === 'internal');
const templateRecords = records.filter((record) => record.classification.kind === 'template');
const reviewRecords = records.filter((record) => record.classification.kind === 'manual_review');
const unclassifiedRecords = records.filter((record) => record.classification.kind === 'unclassified');

const byClient = TRELLO_CLIENTS.map((client) => ({
  ...client,
  count: clientRecords.filter((record) => record.classification.clientId === client.clientId).length,
}));
const byInternal = TRELLO_INTERNAL_STREAMS.map((stream) => ({
  ...stream,
  count: internalRecords.filter((record) => record.classification.streamId === stream.streamId).length,
}));
const byList = (source.lists || []).map((list) => {
  const listRecords = records.filter((record) => record.classification.listName === list.name);
  return {
    name: list.name,
    stage: stageFromListName(list.name),
    total: listRecords.length,
    clients: listRecords.filter((record) => record.classification.kind === 'client').length,
    internal: listRecords.filter((record) => record.classification.kind === 'internal').length,
    templates: listRecords.filter((record) => record.classification.kind === 'template').length,
    review: listRecords.filter((record) => ['manual_review', 'unclassified'].includes(record.classification.kind)).length,
  };
});
const reviewRows = [...reviewRecords, ...unclassifiedRecords]
  .slice(0, 40)
  .map(({ task, classification }) => `| ${escapePipe(task.title)} | ${escapePipe(classification.listName)} | ${escapePipe(classification.labels.join('، ') || 'لا توجد Labels')} | ${classification.reasonLabel} | ${task.externalUrl ? `[فتح البطاقة](${task.externalUrl})` : '—'} |`)
  .join('\n');

const lines = [
  '# تقرير تصنيف Trello — Pilot مَهَد',
  '',
  `**المصدر المقروء:** Board «${source.board?.name || 'غير معروف'}».`,
  `**وقت التقرير:** ${formatDate(new Date().toISOString())}.`,
  '**وضع التقرير:** قراءة وتحليل فقط؛ لم تُنشأ أو تُنقل أو تُعدّل أي بطاقة أو قائمة في Trello.',
  '',
  '## قاعدة التصنيف المعتمدة',
  '',
  '| مصدر Trello | المسار في مَهَد | وضع المشروع الحالي |',
  '|---|---|---|',
  ...TRELLO_CLIENTS.map((client) => `| ${client.clientLabel} | عميل: ${client.clientName} | ${client.projectName || 'يحتاج تعيين مشروع صريح'} |`),
  ...TRELLO_INTERNAL_STREAMS.map((stream) => `| ${stream.streamLabel} | عمل داخلي: ${stream.streamName} | ${stream.category} |`),
  '| قائمة `قوالب المهام` | المكتبة والقوالب | ليست تنفيذًا نشطًا |',
  '| Label مفقود أو غير معرّف | مراجعة التصنيف | لا تخمين |',
  '',
  '> لا تختفي بطاقة من مَهَد بسبب عدم انتمائها إلى Pilot. تظهر كل بطاقة في عميل أو عمل داخلي أو مكتبة قوالب أو قائمة مراجعة تصنيف. يبقى ربط ثبات ومزاد بركة بمشروعيهما قاعدة Pilot مؤقتة فقط.',
  '',
  '## ملخص القراءة',
  '',
  '| المسار | العدد |',
  '|---|---:|',
  `| كل البطاقات المقروءة | ${records.length} |`,
  `| بطاقات العملاء | ${clientRecords.length} |`,
  `| منها مرتبطة بمشروعات Pilot | ${pilotRecords.length} |`,
  `| منها عميل معروف يحتاج مشروعًا صريحًا | ${clientProjectPending.length} |`,
  `| العمل الإداري والتنظيمي الداخلي | ${internalRecords.length} |`,
  `| قوالب المكتبة | ${templateRecords.length} |`,
  `| تحتاج مراجعة تصنيف | ${reviewRecords.length + unclassifiedRecords.length} |`,
  '',
  '## تغطية العملاء',
  '',
  '| العميل | Label القراءة | وضع المشروع | البطاقات |',
  '|---|---|---|---:|',
  ...byClient.map((client) => `| ${client.clientName} | ${client.clientLabel} | ${client.projectName || 'يحتاج تعيين مشروع'} | ${client.count} |`),
  '',
  '## العمل الداخلي',
  '',
  '| المسار | Label القراءة | الفئة | البطاقات |',
  '|---|---|---|---:|',
  ...byInternal.map((stream) => `| ${stream.streamName} | ${stream.streamLabel} | ${stream.category} | ${stream.count} |`),
  '',
  '## التوزيع حسب قائمة Trello',
  '',
  '| قائمة Trello | مرحلة مَهَد المقروءة | الإجمالي | عملاء | داخلي | قوالب | مراجعة تصنيف |',
  '|---|---|---:|---:|---:|---:|---:|',
  ...byList.map((item) => `| ${escapePipe(item.name)} | ${item.stage} | ${item.total} | ${item.clients} | ${item.internal} | ${item.templates} | ${item.review} |`),
  '',
  '## بطاقات تحتاج مراجعة تصنيف',
  '',
  'هذه البطاقات ستبقى مرئية في مَهَد ضمن «تحتاج تصنيفًا». لا يقترح التقرير إضافة Label أو نقل بطاقة؛ يطلب فقط قرارًا بشريًا عند الحاجة.',
  '',
  '| البطاقة | قائمة Trello | Labels الحالية | سبب المراجعة | المصدر |',
  '|---|---|---|---|---|',
  reviewRows || '| لا توجد بطاقات تحتاج مراجعة | — | — | — | — |',
  '',
  '## نتيجة المرحلة',
  '',
  'تستطيع طبقة القراءة الآن عرض كل بطاقة من Board ضمن مسار مفهوم: عميل، عمل داخلي، قوالب، أو مراجعة. ولا يمنح هذا الجسر صلاحية كتابة أو تغيير في Trello.',
  '',
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({
  cards: records.length,
  clients: clientRecords.length,
  pilot: pilotRecords.length,
  clientProjectPending: clientProjectPending.length,
  internal: internalRecords.length,
  templates: templateRecords.length,
  review: reviewRecords.length + unclassifiedRecords.length,
  outputPath,
}, null, 2));
