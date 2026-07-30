const TRELLO_API = 'https://api.trello.com/1';
const FETCH_TIMEOUT_MS = 20000;

function authParams(apiKey, token) {
  return 'key=' + encodeURIComponent(apiKey) + '&token=' + encodeURIComponent(token);
}

async function trelloFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          'مفتاح أو Token غير صالح. تأكد أنك نسخت API Key وليس Secret، وأنشأت Token من رابط التفويض.'
        );
      }
      throw new Error(text || 'خطأ تريلو ' + res.status);
    }
    return res.json();
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('انتهت مهلة الاتصال بتريلو. تحقق من الشبكة وحاول مرة أخرى.');
    }
    if (err && err.message && /Failed to fetch|NetworkError|Load failed/i.test(err.message)) {
      throw new Error('تعذر الوصول لـ api.trello.com من المتصفح. تحقق من الشبكة أو مانع الإعلانات.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** التحقق من صحة المفاتيح وإرجاع بيانات العضو */
export async function trelloTestConnection(apiKey, token) {
  return trelloFetch(
    TRELLO_API + '/members/me?' + authParams(apiKey, token) + '&fields=id,fullName,username'
  );
}

/**
 * كل البطاقات المفتوحة المسندة للعضو الحالي.
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

  return trelloFetch(
    TRELLO_API +
      '/members/me/cards?' +
      authParams(apiKey, token) +
      '&filter=open&fields=' +
      fields
  );
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
      dueDate = y + '-' + m + '-' + day;
    }
  }

  const labelNames = (card.labels || []).map((l) => l.name).filter(Boolean);
  const notesParts = [];
  if (card.desc) notesParts.push(card.desc);
  if (labelNames.length) notesParts.push('تسميات: ' + labelNames.join('، '));

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
