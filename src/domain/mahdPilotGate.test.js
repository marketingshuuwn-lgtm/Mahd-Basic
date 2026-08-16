import test from 'node:test';
import assert from 'node:assert/strict';
import { createPilotEvent, createPilotRun, PILOT_EVENT_TYPES } from './mahdPilot.js';
import { assertPilotGatePassed, evaluatePilotGate } from './mahdPilotGate.js';

test('يرفض بوابة توسيع Trello بلا Pilot فعلي', () => {
  const result = evaluatePilotGate(null, []);
  assert.equal(result.passed, false);
  assert.throws(() => assertPilotGatePassed(null, []), /لا يمكن توسيع/);
});

test('يرفض Pilot مكتملًا بلا جهد وتسليم وقبول فعلي', () => {
  const run = createPilotRun({ id: 'pilot-incomplete', clientId: 'c', projectId: 'p', deliverableId: 'd', title: 'غير مكتمل', status: 'completed' });
  const result = evaluatePilotGate(run, []);
  assert.equal(result.passed, false);
  assert.ok(result.reasons.some((reason) => reason.includes('دقائق')));
});

test('يمرر البوابة بعد جهد وتسليم وقبول', () => {
  const run = createPilotRun({ id: 'pilot-complete', clientId: 'c', projectId: 'p', deliverableId: 'd', title: 'مكتمل', status: 'completed' });
  const events = [
    createPilotEvent({ runId: run.id, type: PILOT_EVENT_TYPES.started, minutes: 45, at: '2026-08-16T10:00:00.000Z' }),
    createPilotEvent({ runId: run.id, type: PILOT_EVENT_TYPES.delivered, at: '2026-08-16T11:00:00.000Z' }),
    createPilotEvent({ runId: run.id, type: PILOT_EVENT_TYPES.delivery_accepted, at: '2026-08-16T11:15:00.000Z' }),
  ];
  const result = assertPilotGatePassed(run, events);
  assert.equal(result.passed, true);
  assert.equal(result.summary.effortMinutes, 45);
});
