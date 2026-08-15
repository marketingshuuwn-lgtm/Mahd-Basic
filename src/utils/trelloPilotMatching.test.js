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
  assert.equal(result.kind, 'client');
  assert.equal(result.client, 'ثبات');
  assert.equal(result.project, 'تقويم تحريري وخطة محتوى');
  assert.equal(result.projectAssignment, 'pilot_one_project_per_client');
});

test('يطابق Label مزاد بركة مع العميل ومشروع Pilot المؤقت', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['BRK - مزاد بركة'] }));
  assert.equal(result.kind, 'client');
  assert.equal(result.client, 'مزاد بركة');
  assert.equal(result.project, 'استراتيجية العلامة');
});

test('يعرض سنام كعميل من دون تخمين مشروع', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['SNM - سنام'] }));
  assert.equal(result.kind, 'client');
  assert.equal(result.client, 'سنام');
  assert.equal(result.project, null);
  assert.equal(result.requiresProjectAssignment, true);
});

test('يعرض علامة تسويق كعميل من دون تخمين مشروع', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['ALM - علامة تسويق'] }));
  assert.equal(result.kind, 'client');
  assert.equal(result.client, 'علامة تسويق');
  assert.equal(result.project, null);
});

test('يصنف علامة الأم كعمل داخلي لا كعميل', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['ALH - علامة الأم'] }));
  assert.equal(result.kind, 'internal');
  assert.equal(result.stream, 'علامة الأم');
  assert.equal(result.category, 'إداري وتنظيمي داخلي');
});

test('يبقي بطاقة بلا Label مرئية بوصفها غير مصنفة بدل استبعادها', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: [] }));
  assert.equal(result.kind, 'unclassified');
  assert.equal(result.reason, 'missing_label');
});

test('يبقي Label غير معروف مرئيًا بوصفه غير مصنف', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['عميل جديد'] }));
  assert.equal(result.kind, 'unclassified');
  assert.equal(result.reason, 'unknown_label');
});

test('يفرض مراجعة يدوية عند وجود تصنيفين معروفين', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['THB - ثبات', 'ALH - علامة الأم'] }));
  assert.equal(result.kind, 'manual_review');
  assert.equal(result.reason, 'multiple_known_routes');
});

test('يصنف القوالب في المكتبة حتى لو حملت Label عميل', () => {
  const result = classifyTrelloTaskForPilot(task({ labels: ['THB - ثبات'], listName: 'قوالب المهام' }));
  assert.equal(trelloListIsPilotTemplate('قوالب المهام'), true);
  assert.equal(result.kind, 'template');
  assert.equal(result.route, 'library_templates');
});

test('يبني تقريرًا يغطي العملاء والعمل الداخلي والقوالب وغير المصنف', () => {
  const tasks = [
    task({ labels: ['THB - ثبات'], title: 'ثبات' }),
    task({ labels: ['BRK - مزاد بركة'], title: 'بركة' }),
    task({ labels: ['SNM - سنام'], title: 'سنام' }),
    task({ labels: ['ALM - علامة تسويق'], title: 'علامة تسويق' }),
    task({ labels: ['ALH - علامة الأم'], title: 'عمل داخلي' }),
    task({ labels: [], title: 'بلا Label' }),
    task({ labels: ['THB - ثبات'], listName: 'قوالب المهام', title: 'قالب' }),
    task({ labels: ['THB - ثبات', 'BRK - مزاد بركة'], title: 'متعارض' }),
  ];
  const report = buildPilotTrelloMatchReport(tasks);

  assert.equal(report.total, 8);
  assert.equal(report.client.length, 4);
  assert.equal(report.pilotMatched.length, 2);
  assert.equal(report.clientNeedsProject.length, 2);
  assert.equal(report.internal.length, 1);
  assert.equal(report.templates.length, 1);
  assert.equal(report.unclassified.length, 1);
  assert.equal(report.review.length, 1);
  assert.equal(report.byClient.find((client) => client.clientName === 'سنام').taskCount, 1);
  assert.equal(report.byInternalStream[0].taskCount, 1);
  assert.equal(tasks[0].externalMeta.labels[0], 'THB - ثبات');
});
