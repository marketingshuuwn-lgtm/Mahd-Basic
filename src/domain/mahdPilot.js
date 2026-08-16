export const PILOT_EVENT_TYPES = Object.freeze({
  started: 'started',
  progress: 'progress',
  error: 'error',
  rework: 'rework',
  review_submitted: 'review_submitted',
  review_approved: 'review_approved',
  delivered: 'delivered',
  delivery_accepted: 'delivery_accepted',
});

export const PILOT_RUN_STATUSES = ['planned', 'active', 'paused', 'completed', 'cancelled'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

export function createPilotRun({ id, clientId, projectId, deliverableId, title, actorId = null, baseline = {}, status = 'planned', now } = {}) {
  if (!clean(clientId) || !clean(projectId) || !clean(deliverableId)) throw new Error('Pilot يحتاج عميلًا ومشروعًا ومخرجًا.');
  if (!clean(title)) throw new Error('عنوان Pilot مطلوب.');
  return {
    id: id || `pilot-${Date.now()}`,
    entityType: 'pilot_run',
    clientId: clean(clientId),
    projectId: clean(projectId),
    deliverableId: clean(deliverableId),
    title: clean(title),
    actorId: actorId || null,
    baseline: { effortMinutes: null, cycleMinutes: null, errorCount: null, reworkCount: null, ...baseline },
    status: PILOT_RUN_STATUSES.includes(status) ? status : 'planned',
    startedAt: null,
    completedAt: null,
    createdAt: nowIso(now),
    updatedAt: nowIso(now),
  };
}

export function createPilotEvent({ id, runId, type, actorId = null, at, minutes = 0, note = '', metadata = {}, now } = {}) {
  if (!clean(runId)) throw new Error('معرّف Pilot مطلوب للحدث.');
  if (!Object.values(PILOT_EVENT_TYPES).includes(type)) throw new Error('نوع حدث Pilot غير معروف.');
  const normalizedMinutes = Number(minutes);
  if (!Number.isFinite(normalizedMinutes) || normalizedMinutes < 0) throw new Error('دقائق الجهد يجب أن تكون رقمًا غير سالب.');
  return {
    id: id || `pilot-event-${Date.now()}`,
    entityType: 'pilot_event',
    runId: clean(runId),
    type,
    actorId: actorId || null,
    at: at || nowIso(now),
    minutes: normalizedMinutes,
    note: clean(note),
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
    createdAt: nowIso(now),
  };
}

export function summarizePilotRun(run, events = []) {
  const related = events.filter((event) => event.runId === run.id).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const effortMinutes = related.reduce((total, event) => total + Number(event.minutes || 0), 0);
  const errors = related.filter((event) => event.type === PILOT_EVENT_TYPES.error);
  const rework = related.filter((event) => event.type === PILOT_EVENT_TYPES.rework);
  const first = related[0]?.at || run.startedAt;
  const last = related.at(-1)?.at || run.completedAt;
  const cycleMinutes = first && last ? Math.max(0, Math.round((new Date(last) - new Date(first)) / 60000)) : null;
  return {
    runId: run.id,
    status: run.status,
    effortMinutes,
    cycleMinutes,
    errorCount: errors.length,
    reworkCount: rework.length,
    delivered: related.some((event) => event.type === PILOT_EVENT_TYPES.delivered),
    deliveryAccepted: related.some((event) => event.type === PILOT_EVENT_TYPES.delivery_accepted),
    eventCount: related.length,
  };
}
