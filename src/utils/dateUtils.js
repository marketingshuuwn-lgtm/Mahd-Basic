/** تنسيق تاريخ محلي بدون مشاكل UTC */
export function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return 'غير محدد';
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'بكرة';
    if (diff === -1) return 'أمس';
    return d.toLocaleDateString('ar-EG');
  } catch (e) {
    return 'غير محدد';
  }
}

const WEEKDAY_MAP = {
  احد: 0, الأحد: 0, الاحد: 0,
  اثنين: 1, الإثنين: 1, الاثنين: 1,
  ثلاثاء: 2, الثلاثاء: 2,
  اربعاء: 3, الأربعاء: 3, الاربعاء: 3,
  خميس: 4, الخميس: 4,
  جمعة: 5, الجمعة: 5,
  سبت: 6, السبت: 6,
};

function nextWeekday(targetDay) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const current = d.getDay();
  let add = (targetDay - current + 7) % 7;
  if (add === 0) add = 7; // القادم = الأسبوع القادم إذا كان اليوم نفسه
  d.setDate(d.getDate() + add);
  return d;
}

function parseNumericDate(text) {
  // 15/8/2026 أو 15-8-2026 أو 2026-08-15 أو 15/8
  const iso = text.match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dmy = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]), 12);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dm = text.match(/(\d{1,2})[\/\-.](\d{1,2})(?![\d\/\-.])/);
  if (dm) {
    const year = new Date().getFullYear();
    const d = new Date(year, Number(dm[2]) - 1, Number(dm[1]), 12);
    if (!Number.isNaN(d.getTime())) {
      // إذا التاريخ مضى هذا العام، نفترض السنة القادمة
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) d.setFullYear(year + 1);
      return d;
    }
  }
  return null;
}

/**
 * يحلل نصاً حراً بالعربي ويستخرج عنوان المهمة وتاريخ الاستحقاق.
 * يدعم: اليوم، بكرة، غداً، بعد أسبوع، أيام الأسبوع، وتواريخ رقمية.
 */
export function parseSmartInput(text) {
  let dueDate = '';
  let title = text;
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // تواريخ رقمية أولاً
  const numeric = parseNumericDate(text);
  if (numeric) {
    dueDate = toLocalISO(numeric);
    title = text
      .replace(/\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}/, '')
      .replace(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}/, '')
      .replace(/\d{1,2}[\/\-.]\d{1,2}/, '')
      .trim();
  } else if (/\bاليوم\b/.test(text)) {
    dueDate = toLocalISO(today);
    title = text.replace(/\bاليوم\b/g, '').trim();
  } else if (/بكرة|غداً?|غدا/.test(text)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    dueDate = toLocalISO(t);
    title = text.replace(/بكرة|غداً?|غدا/g, '').trim();
  } else if (/بعد\s*أسبوع|الأسبوع\s*القادم/.test(text)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 7);
    dueDate = toLocalISO(t);
    title = text.replace(/بعد\s*أسبوع|الأسبوع\s*القادم/g, '').trim();
  } else if (/بعد\s*يومين/.test(text)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 2);
    dueDate = toLocalISO(t);
    title = text.replace(/بعد\s*يومين/g, '').trim();
  } else if (/بعد\s*ثلاثة\s*أيام|بعد\s*٣\s*أيام/.test(text)) {
    const t = new Date(today);
    t.setDate(t.getDate() + 3);
    dueDate = toLocalISO(t);
    title = text.replace(/بعد\s*ثلاثة\s*أيام|بعد\s*٣\s*أيام/g, '').trim();
  } else {
    // يوم الأسبوع: الخميس القادم / يوم الخميس / الخميس
    for (const [name, dayNum] of Object.entries(WEEKDAY_MAP)) {
      const re = new RegExp(`(يوم\s*)?${name}(\s*القادم)?`);
      if (re.test(text)) {
        dueDate = toLocalISO(nextWeekday(dayNum));
        title = text.replace(re, '').trim();
        break;
      }
    }
  }

  title = title.replace(/^[-,،:\s]+|[-,،:\s]+$/g, '').replace(/\s{2,}/g, ' ');
  return { title: title || text.trim(), dueDate };
}
