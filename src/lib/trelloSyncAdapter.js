import { trelloCreateCard, trelloUpdateCard } from './trello.js';

export const WRITEABLE_TRELLO_OPERATIONS = ['task.create', 'task.update'];

export function buildTrelloWritePlan(operation, { defaultListId = null, listId = null } = {}) {
  if (!operation?.entityType || !operation?.operation) throw new Error('عملية مَهَد غير مكتملة.');
  const key = `${operation.entityType}.${operation.operation}`;
  if (key === 'task.create') {
    return {
      key,
      supported: Boolean(defaultListId || listId),
      requiresApproval: true,
      target: { kind: 'card', listId: listId || defaultListId },
      payload: { title: operation.payload?.title || '', description: operation.payload?.description || '', dueDate: operation.payload?.dueDate || null },
      reason: listId || defaultListId ? 'إنشاء بطاقة في قائمة Trello المعتمدة.' : 'لا توجد قائمة Trello معتمدة لإنشاء المهمة.',
    };
  }
  if (key === 'task.update') {
    return {
      key,
      supported: Boolean(operation.payload?.externalId),
      requiresApproval: true,
      target: { kind: 'card', cardId: operation.payload?.externalId || null },
      payload: { title: operation.payload?.title, description: operation.payload?.description, dueDate: operation.payload?.dueDate || null, listId: operation.payload?.listId || null, closed: operation.payload?.closed },
      reason: operation.payload?.externalId ? 'تحديث بطاقة مرتبطة بالمعرّف الخارجي بعد مراجعة التغيير.' : 'لا يوجد معرّف Trello للبطاقة المراد تحديثها.',
    };
  }
  return {
    key,
    supported: false,
    requiresApproval: true,
    target: { kind: 'unmapped' },
    payload: operation.payload || {},
    reason: 'هذا النوع يحتاج خريطة كتابة صريحة قبل إرساله إلى Trello؛ لم يُخمّن الموصل تمثيله.',
  };
}

export function assertApprovedWrite(operation, plan, { approvedBy } = {}) {
  if (!plan?.supported) throw new Error('عملية Trello غير مدعومة أو بلا هدف صريح.');
  if (operation?.status !== 'approved') throw new Error('لا يمكن الكتابة إلى Trello قبل اعتماد العملية داخل مَهَد.');
  if (!approvedBy) throw new Error('هوية صاحب الموافقة مطلوبة قبل الكتابة إلى Trello.');
  return true;
}

export async function executeApprovedTrelloWrite({ operation, plan, apiKey, accessToken, approvedBy }) {
  assertApprovedWrite(operation, plan, { approvedBy });
  if (plan.key === 'task.create') {
    return trelloCreateCard(apiKey, accessToken, { listId: plan.target.listId, title: plan.payload.title, description: plan.payload.description, dueDate: plan.payload.dueDate });
  }
  if (plan.key === 'task.update') {
    return trelloUpdateCard(apiKey, accessToken, plan.target.cardId, plan.payload);
  }
  throw new Error('عملية Trello غير مدعومة.');
}
