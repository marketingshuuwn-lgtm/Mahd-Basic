const TRELLO_API = 'https://api.trello.com/1';

function authParams(apiKey, token) {
  return `key=${encodeURIComponent(apiKey)}&token=${encodeURIComponent(token)}`;
}

/** التحقق من صحة المفاتيح وإرجاع بيانات العضو */
export async function trelloTestConnection(apiKey, token) {
  const res = await fetch(`${TRELLO_API}/members/me?${authParams(apiKey, token)}&fields=id,fullName,username`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Trello error ${res.status}`);
  }
  return res.json();
}

/**
 * كل البطاقات المفتوحة المسندة للعضو الحالي عبر اللوحات التي يراها.
 * @see https://developer.atlassian.com/cloud/trello/rest/api-group-members/
 */
export async function trelloFetchMyOpenCards(apiKey, token) {
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
    'labels',
    'dateLastActivity',
  ].join(',');

  const res = await fetch(
    `${TRELLO_API}/members/me/cards?${authParams(apiKey, token)}&filter=open&fields=${fields}`
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Trello error ${res.status}`);
  }
  return res.json();
}

/** تحويل بطاقة تريلو إلى حقول مهمة مهد */
export function mapTrelloCardToTaskFields(card) {
  let dueDate = '';
  if (card.due) {
    const d = new Date(card.due);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dueDate = `${y}-${m}-${day}`;
    }
  }

  const labelNames = (card.labels || []).map((l) => l.name).filter(Boolean);
  const notesParts = [];
  if (card.desc) notesParts.push(card.desc);
  if (labelNames.length) notesParts.push(`تسميات: ${labelNames.join('، ')}`);

  return {
    title: (card.name || 'بطاقة تريلو').trim(),
    notes: notesParts.join('\n\n'),
    dueDate,
    completed: !!card.dueComplete,
    external_source: 'trello',
    external_id: card.id,
    external_url: card.shortUrl || card.url || null,
    external_meta: {
      boardId: card.idBoard,
      listId: card.idList,
      labels: labelNames,
    },
  };
}
