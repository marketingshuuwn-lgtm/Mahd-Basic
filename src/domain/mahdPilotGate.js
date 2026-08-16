import { summarizePilotRun } from './mahdPilot.js';

export function evaluatePilotGate(run, events = []) {
  if (!run) return { passed: false, reasons: ['لا يوجد سجل Pilot.'], summary: null };
  const summary = summarizePilotRun(run, events);
  const reasons = [];
  if (run.status !== 'completed') reasons.push('Pilot لم يُغلق بحالة مكتملة.');
  if (!summary.eventCount) reasons.push('لا توجد أحداث تشغيل فعلية.');
  if (summary.effortMinutes <= 0) reasons.push('لا توجد دقائق جهد فعلية مسجلة.');
  if (summary.errorCount < 0) reasons.push('سجل الأخطاء غير صالح.');
  if (!summary.delivered) reasons.push('لم يُسجل تسليم المخرج.');
  if (!summary.deliveryAccepted) reasons.push('لم يُسجل قبول التسليم.');
  return { passed: reasons.length === 0, reasons, summary };
}

export function assertPilotGatePassed(run, events = []) {
  const result = evaluatePilotGate(run, events);
  if (!result.passed) throw new Error(`لا يمكن توسيع مزامنة Trello قبل اجتياز Pilot: ${result.reasons.join(' ')}`);
  return result;
}
