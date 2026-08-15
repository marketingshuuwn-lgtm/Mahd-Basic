import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAgencyOperationalView } from './agencyOperationalView.js';

function task({ id, title, labels = [], listName = 'قيد التنفيذ', dueDate = null, completed = false }) {
  return {
    id,
    title,
    dueDate,
    completed,
    externalSource: 'trello',
    externalUrl: `https://trello.com/c/${id}`,
    externalMeta: { labels, listName },
  };
}

test('يبني عرضًا تشغيليًا يغطي العملاء والعمل الداخلي والقوالب والمراجعة', () => {
  const view = buildAgencyOperationalView([
    task({ id: 'thb', title: 'تقويم ثبات', labels: ['THB - ثبات'] }),
    task({ id: 'snm', title: 'مراجعة سنام', labels: ['SNM - سنام'] }),
    task({ id: 'alm', title: 'تشغيل علامة الأم', labels: ['ALH - علامة الأم'] }),
    task({ id: 'template', title: 'قالب', labels: [], listName: 'قوالب المهام' }),
    task({ id: 'unknown', title: 'دون تصنيف', labels: [] }),
  ], { mode: 'snapshot', detail: 'اختبار' });

  assert.equal(view.report.total, 5);
  assert.equal(view.clientCards.length, 2);
  assert.equal(view.internal.length, 1);
  assert.equal(view.templates.length, 1);
  assert.equal(view.review.length, 1);
  assert.equal(view.clients.find((client) => client.clientName === 'ثبات').cards.length, 1);
  assert.equal(view.clients.find((client) => client.clientName === 'سنام').cards[0].project, null);
  assert.equal(view.internal[0].stream, 'علامة الأم');
  assert.equal(view.review[0].reasonLabel, 'Label التصنيف مفقود');
});
