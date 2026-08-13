const TRELLO_API = 'https://api.trello.com/1';
const FETCH_TIMEOUT_MS = 20000;

function withAuth(path, apiKey, token, params = {}) {
  const url = new URL(path.startsWith('http') ? path : TRELLO_API + path);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('token', token);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  return url.toString();
}

async function trelloRequest(path, apiKey, token, { method = 'GET', params } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(withAuth(path, apiKey, token, params), {
      method,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          'تعذّر الوصول إلى تريلو. تأكد من صحة الـ API Key والـ Token ومن صلاحية الوصول إلى الـ Board.'
        );
      }
      throw new Error(text || `خطأ تريلو ${res.status}`);
    }
    if (res.status === 204) return null;
    return res.json();
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بتريلو. تحقق من الشبكة وحاول مرة أخرى.');
    }
    if (err?.message && /Failed to fetch|NetworkError|Load failed/i.test(err.message)) {
      throw new Error('تعذر الوصول إلى api.trello.com من المتصفح. تحقق من الشبكة أو مانع الإعلانات.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** التحقق من صحة التفويض وإرجاع العضو الحالي. */
export async function trelloTestConnection(apiKey, token) {
  return trelloRequest('/members/me', apiKey, token, {
    params: { fields: 'id,fullName,username' },
  });
}

/** كل الـ Boards المرئية للعضو الحالي، وهي مساحات النسخة الأولى من مَهَد. */
export async function trelloFetchMyBoards(apiKey, token) {
  return trelloRequest('/members/me/boards', apiKey, token, {
    params: { filter: 'open', fields: 'id,name,url,closed,dateLastActivity' },
  });
}

/** القوائم المفتوحة في Board، لاستخدامها كخريطة مراحل اختيارية. */
export async function trelloFetchBoardLists(apiKey, token, boardId) {
  return trelloRequest(`/boards/${encodeURIComponent(boardId)}/lists`, apiKey, token, {
    params: { filter: 'open', fields: 'id,name,pos,closed' },
  });
}

/** بطاقات Board محدد؛ لا يقرأ التطبيق بطاقات كل الحساب تلقائيًا. */
export async function trelloFetchBoardCards(apiKey, token, boardId) {
  const fields = [
    'id',
    'name',
    'desc',
    'due',
    'dueComplete',
    'shortUrl',
    'url',
    'idBoard',
    'idList',
    'idMembers',
    'labels',
    'dateLastActivity',
    'closed',
    'pos',
  ].join(',');

  return trelloRequest(`/boards/${encodeURIComponent(boardId)}/cards`, apiKey, token, {
    params: {
      filter: 'all',
      attachments: 'true',
      attachment_fields: 'id,name,url,bytes,mimeType,date',
      checklists: 'all',
      checklist_fields: 'id,name,checkItems,pos',
      fields,
    },
  });
}

export async function trelloCreateCard(apiKey, token, { listId, title, description = '', dueDate }) {
  if (!listId) throw new Error('اختر قائمة افتراضية في تريلو قبل إضافة مهمة جديدة.');
  return trelloRequest('/cards', apiKey, token, {
    method: 'POST',
    params: {
      idList: listId,
      name: title,
      desc: description,
      due: dueDate || null,
    },
  });
}

export async function trelloUpdateCard(apiKey, token, cardId, patch = {}) {
  return trelloRequest(`/cards/${encodeURIComponent(cardId)}`, apiKey, token, {
    method: 'PUT',
    params: {
      name: patch.title,
      desc: patch.description,
      due: patch.dueDate,
      closed: patch.closed,
      idList: patch.listId,
    },
  });
}

export async function trelloSetCardClosed(apiKey, token, cardId, closed) {
  return trelloUpdateCard(apiKey, token, cardId, { closed: closed ? 'true' : 'false' });
}

function mapAttachments(card) {
  const list = Array.isArray(card.attachments) ? card.attachments : [];
  return list
    .map((attachment) => ({
      id: attachment.id,
      name: attachment.name || 'مرفق',
      url: attachment.url || null,
      mimeType: attachment.mimeType || null,
    }))
    .filter((attachment) => attachment.url);
}

function mapChecklists(card) {
  return (Array.isArray(card.checklists) ? card.checklists : []).flatMap((checklist) =>
    (Array.isArray(checklist.checkItems) ? checklist.checkItems : []).map((item) => ({
      id: item.id,
      title: item.name || 'بند فرعي',
      completed: item.state === 'complete',
      sortOrder: item.pos || 0,
    }))
  );
}

/** يحوّل بطاقة Trello إلى الحقول المشتركة التي تحتاجها واجهة مَهَد. */
export function mapTrelloCardToTaskFields(card) {
  let dueDate = '';
  if (card.due) {
    const date = new Date(card.due);
    if (!Number.isNaN(date.getTime())) {
      dueDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;
    }
  }

  const labelNames = (card.labels || []).map((label) => label.name).filter(Boolean);
  const attachments = mapAttachments(card);
  const notesParts = [];
  if (card.desc) notesParts.push(card.desc);
  if (labelNames.length) notesParts.push(`تسميات: ${labelNames.join('، ')}`);
  if (attachments.length) {
    notesParts.push(`مرفقات تريلو:\n${attachments.map((a) => `- ${a.name}: ${a.url}`).join('\n')}`);
  }

  return {
    id: card.id,
    title: (card.name || 'بطاقة تريلو').trim(),
    notes: notesParts.join('\n\n'),
    dueDate,
    completed: Boolean(card.closed),
    subtasks: mapChecklists(card),
    externalSource: 'trello',
    externalId: card.id,
    externalUrl: card.shortUrl || card.url || null,
    externalMeta: {
      boardId: card.idBoard,
      listId: card.idList,
      memberIds: card.idMembers || [],
      labels: labelNames,
      attachments,
      cardPosition: card.pos || 0,
    },
    lastSyncedAt: new Date().toISOString(),
    createdAt: card.dateLastActivity || new Date().toISOString(),
    completedAt: card.closed ? card.dateLastActivity || new Date().toISOString() : null,
  };
}

/** توافق مؤقت مع الاستيراد القديم، لكنه لا يُستخدم في تدفق Trello-first الجديد. */
export async function trelloFetchMyOpenCards(apiKey, token) {
  return trelloRequest('/members/me/cards', apiKey, token, {
    params: { filter: 'open', attachments: 'true', fields: 'id,name,desc,due,shortUrl,url,idBoard,idList,labels,closed' },
  });
}
