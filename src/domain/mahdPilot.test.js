import test from 'node:test';
import assert from 'node:assert/strict';
import { createPilotEvent, createPilotRun, PILOT_EVENT_TYPES, summarizePilotRun } from './mahdPilot.js';
import { createMahdRepository } from './mahdRepository.js';
import { createMemoryStorageAdapter } from './mahdStorageAdapter.js';

test('ينشئ Pilot مرتبطًا بعميل ومشروع ومخرج', () => {
  const run = createPilotRun({ id: 'pilot-mr-art', clientId: 'client-mr-art', projectId: 'project-foundation', deliverableId: 'deliverable-brand', title: 'Pilot استراتيجية العلامة' });
  assert.equal(run.status, 'planned');
  assert.equal(run.clientId, 'client-mr-art');
});

test('يحسب الجهد والأخطاء وإعادة العمل والتسليم من الأحداث', () => {
  const run = createPilotRun({ id: 'pilot-metrics', clientId: 'c', projectId: 'p', deliverableId: 'd', title: 'قياس' });
  const events = [
    createPilotEvent({ id: 'e1', runId: run.id, type: PILOT_EVENT_TYPES.started, minutes: 30, at: '2026-08-16T10:00:00.000Z' }),
    createPilotEvent({ id: 'e2', runId: run.id, type: PILOT_EVENT_TYPES.error, minutes: 10, at: '2026-08-16T10:30:00.000Z', note: 'نقص في الموجز' }),
    createPilotEvent({ id: 'e3', runId: run.id, type: PILOT_EVENT_TYPES.rework, minutes: 20, at: '2026-08-16T11:00:00.000Z' }),
    createPilotEvent({ id: 'e4', runId: run.id, type: PILOT_EVENT_TYPES.delivered, minutes: 0, at: '2026-08-16T12:00:00.000Z' }),
    createPilotEvent({ id: 'e5', runId: run.id, type: PILOT_EVENT_TYPES.delivery_accepted, minutes: 0, at: '2026-08-16T12:10:00.000Z' }),
  ];
  const summary = summarizePilotRun({ ...run, status: 'completed' }, events);
  assert.equal(summary.effortMinutes, 60);
  assert.equal(summary.cycleMinutes, 130);
  assert.equal(summary.errorCount, 1);
  assert.equal(summary.reworkCount, 1);
  assert.equal(summary.delivered, true);
  assert.equal(summary.deliveryAccepted, true);
});

test('يحفظ سجل Pilot وأحداثه عبر المستودع القابل للاستبدال', () => {
  const repository = createMahdRepository({ adapter: createMemoryStorageAdapter() });
  const run = createPilotRun({ id: 'pilot-save', clientId: 'c', projectId: 'p', deliverableId: 'd', title: 'حفظ Pilot' });
  const event = createPilotEvent({ id: 'event-save', runId: run.id, type: PILOT_EVENT_TYPES.started, minutes: 5 });
  repository.savePilotRun(run);
  repository.savePilotEvent(event);
  const state = repository.load();
  assert.equal(state.pilotRuns[0].id, run.id);
  assert.equal(state.pilotEvents[0].runId, run.id);
});
