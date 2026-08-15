import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  throw new Error('Usage: node generatePilotTrelloMatchReport.js <input.json> <output.md>');
}

const SOURCE = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const CLIENT_PROJECTS = {
  'THB - ثبات': { client: 'ثبات', project: 'تقويم تحريري وخطة محتوى' },
  'BRK - مزاد بركة': { client: 'مزاد بركة', project: 'استراتيجية العلامة' },
};

function stageFromListName(name) {
  const normalized = String(name || '').trim().toLocaleLowerCase('ar');
  if (['منجز', 'مكتمل', 'مكتملة', 'تم', 'done'].includes(normalized)) return 'منجزة';
  if (['قيد التنفيذ', 'جاري التنفيذ', 'في التنفيذ', 'للمراجعة', 'مراجعة', 'doing', 'review'].includes(normalized)) return 'قيد التنفيذ';
  if (['بانتظار البدء', 'لم تبدأ', 'قائمة الانتظار', 'to do', 'todo'].includes(normalized)) return 'لم تبدأ';
  return 'غير معيّنة';
}

const cards = (SOURCE.lists || []).flatMap((list) =>
  (list.cards || []).map((card) => ({
    ...card,
    listName: list.name || 'قائمة غير مسماة',
    stage: stageFromListName(list.name),
  }))
);

const classify = (card) => {
  const labels = (card.labels || []).map((label) => label.name).filter(Boolean);
  const recognized = labels.filter((name) => CLIENT_PROJECTS[name]);
  if (recognized.length === 1) return { kind: 'matched', labels, mapping: CLIENT_PROJECTS[recognized[0]] };
  if (recognized.length > 1) return { kind: 'ambiguous', labels };
  return { kind: 'unmatched', labels };
};

const classified = cards.map((card) => ({ card, result: classify(card) }));
const matched = classified.filter(({ result }) => result.kind === 'matched');
const unmatched = classified.filter(({ result }) => result.kind === 'unmatched');
const ambiguous = classified.filter(({ result }) => result.kind === 'ambiguous');
const open = cards.filter((card) => !card.closed);
const closed = cards.filter((card) => card.closed);

const byList = (SOURCE.lists || []).map((list) => {
  const items = classified.filter(({ card }) => card.listName === list.name);
  return {
    name: list.name,
    stage: stageFromListName(list.name),
    total: items.length,
    matched: items.filter(({ result }) => result.kind === 'matched').length,
    unmatched: items.filter(({ result }) => result.kind === 'unmatched').length,
    ambiguous: items.filter(({ result }) => result.kind === 'ambiguous').length,
  };
});

const byClient = Object.keys(CLIENT_PROJECTS).map((label) => {
  const mapping = CLIENT_PROJECTS[label];
  const items = matched.filter(({ result }) => result.mapping.client === mapping.client);
  return { ...mapping, label, total: items.length };
});

const escapePipe = (value) => String(value || '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const formatDate = (value) => value ? new Date(value).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Riyadh' }) : '—';

const exceptionRows = [...ambiguous, ...unmatched]
  .map(({ card, result }) => `| ${escapePipe(card.name)} | ${escapePipe(card.listName)} | ${escapePipe(result.labels.join('، ') || 'لا توجد Labels')} | ${result.kind === 'ambiguous' ? 'يحمل أكثر من Label Pilot' : 'لا يحمل Label عميل Pilot'} | [فتح البطاقة](${card.url}) |`)
  .join('\n');

const lines = [
  '# تقرير مطابقة Trello — Pilot مَهَد',
  '',
  `**المصدر المقروء:** Board «${SOURCE.board?.name || 'غير معروف'}».  `,
  `**وقت التقرير:** ${formatDate(new Date().toISOString())}.  `,
  '**وضع التقرير:** قراءة وتحليل فقط؛ لم تُنشأ أو تُنقل أو تُعدّل أي بطاقة أو قائمة في Trello.',
  '',
  '## قاعدة المطابقة المعتمدة',
  '',
  '| Label Trello | العميل في مَهَد | مشروع Pilot المؤقت |',
  '|---|---|---|',
  ...Object.entries(CLIENT_PROJECTS).map(([label, mapping]) => `| ${label} | ${mapping.client} | ${mapping.project} |`),
  '',
  '> Label العميل يحدد العميل فقط. ربط المشروع هنا قاعدة Pilot مؤقتة لأن لكل عميل مشروعًا تجريبيًا واحدًا معتمدًا. لا يجوز تعميمها عند وجود أكثر من مشروع للعميل نفسه.',
  '',
  '## ملخص القراءة',
  '',
  '| المؤشر | العدد |',
  '|---|---:|',
  `| كل البطاقات المقروءة | ${cards.length} |`,
  `| بطاقات مفتوحة | ${open.length} |`,
  `| بطاقات مؤرشفة | ${closed.length} |`,
  `| مطابقة إلى عميل ومشروع Pilot | ${matched.length} |`,
  `| غير مطابقة بسبب غياب Label Pilot | ${unmatched.length} |`,
  `| ملتبسة بسبب أكثر من Label Pilot | ${ambiguous.length} |`,
  '',
  '## تغطية عميلَي Pilot',
  '',
  '| العميل | مشروع Pilot | Label القراءة | البطاقات المطابقة |',
  '|---|---|---|---:|',
  ...byClient.map((item) => `| ${item.client} | ${item.project} | ${item.label} | ${item.total} |`),
  '',
  '## التوزيع حسب قائمة Trello',
  '',
  '| قائمة Trello | مرحلة مَهَد المقروءة | الإجمالي | مطابقة | غير مطابقة | ملتبسة |',
  '|---|---|---:|---:|---:|---:|',
  ...byList.map((item) => `| ${escapePipe(item.name)} | ${item.stage} | ${item.total} | ${item.matched} | ${item.unmatched} | ${item.ambiguous} |`),
  '',
  '## الاستثناءات التي لا تدخل Pilot',
  '',
  'لا تعد الاستثناءات أخطاء في Trello. يبين التقرير فقط أنها لا تملك اليوم إشارة كافية تربطها بعميلَي Pilot، لذلك يجب ألا تظهر داخل مشروع ثبات أو مزاد بركة في مَهَد.',
  '',
  '| البطاقة | قائمة Trello | Labels الحالية | سبب الاستثناء | المصدر |',
  '|---|---|---|---|---|',
  exceptionRows || '| لا توجد استثناءات | — | — | — | — |',
  '',
  '## نتيجة المرحلة',
  '',
  'يمكن للجسر القراءة فقط أن يعرض البطاقات المطابقة لعميلَي Pilot مع قائمة Trello والموعد ومالك Trello عند توفرها. وتبقى البطاقات غير المطابقة خارج العرض التشغيلي إلى أن يقرر الفريق Label العميل الصحيح أو يستبعدها من Pilot. لا يوصي هذا التقرير بأي تعديل تلقائي على Trello.',
  '',
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(JSON.stringify({ cards: cards.length, matched: matched.length, unmatched: unmatched.length, ambiguous: ambiguous.length, outputPath }, null, 2));
