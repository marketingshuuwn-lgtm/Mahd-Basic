import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPilotTrelloMatchReport,
  classifyTrelloTaskForPilot,
  trelloListIsPilotTemplate,
} from './trelloPilotMatching.js';

function task({ labels = [], listName = 'قيد التنفيذ', title = 'بطاقة اختبار' } = {}) {
  return {
    title,
    externalMeta: { labels, listName },
  };
}

test('يطابق Label ثبات مع العميل ومشروع Pilot المؤقت', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['THB - ثبات'] }));
  assert.equal(result.kind, 'matched');
  assert.equal(result.client, 'ثبات');
  assert.equal(result.project, 'تقويم تحريري وخطة محتوى');
  assert.equal(result.projectAssignment, 'pilot_one_project_per_client');
});

test('يطابق Label مزاد بركة مع العميل ومشروع Pilot المؤقت', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['BRK - مزاد بركة'] }));
  assert.equal(result.kind, 'matched');
  assert.equal(result.client, 'مزاد بركة');
  assert.equal(result.project, 'استراتيجية العلامة');
});

test('يستبعد البطاقة بلا Label عميل ولا يخمن مشروعًا', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: [] }));
  assert.equal(result.kind, 'excluded');
  assert.equal(result.reason, 'missing_client_label');
  assert.equal(result.client, undefined);
});

test('يستبعد بطاقة تحمل Label غير تابع لعميل Pilot', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['ALH - علامة الأم'] }));
  assert.equal(result.kind, 'excluded');
  assert.equal(result.reason, 'no_pilot_client_label');
});

test('يفرض مراجعة يدوية عند وجود Label عميلَي Pilot معًا', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['THB - ثبات', 'BRK - مزاد بركة'] }));
  assert.equal(result.kind, 'manual_review');
  assert.equal(result.reason, 'multiple_pilot_client_labels');
});

test('يستبعد القوالب حتى لو حملت Label عميل Pilot', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['THB - ثبات'], listName: 'قوالب المهام' }));
  assert.equal(trelloListIsPilotTemplate('قوالب المهام'), true);
  assert.equal(result.kind, 'excluded');
  assert.equal(result.reason, 'template_list');
});

test('يبني التقرير عدادات صحيحة من دون تعديل عناصر الإدخال', () => {
  const tasks = [
    task({ labels: ['THB - ثبات'], title: 'ثبات' }),
    task({ labels: ['BRK - مزاد بركة'], title: 'بركة' }),
    task({ labels: ['ALH - علامة الأم'], title: 'خارج Pilot' }),
    task({ labels: [], title: 'بلا Label' }),
    task({ labels: ['THB - ثبات'], listName: 'قوالب المهام', title: 'قالب' }),
    task({ labels: ['THB - ثبات', 'BRK - مزاد بركة'], title: 'متعارض' }),
  ];
  const report = buildPilotTrelloMatchReport(tasks);

  assert.equal(report.total, 6);
  assert.equal(report.matched.length, 2);
  assert.equal(report.excluded.length, 3);
  assert.equal(report.review.length, 1);
  assert.equal(report.coveragePercent, 33);
  assert.equal(report.byClient.find((client) => client.clientName === 'ثبات').taskCount, 1);
  assert.equal(report.byClient.find((client) => client.clientName === 'مزاد بركة').taskCount, 1);
  assert.equal(tasks[0].externalMeta.labels[0], 'THB - ثبات');
});
