/** تنسيق تاريخ محلي بدون مشاكل UTC */
export function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

/**
 * due_date = تاريخ البداية
 * المدة بالأيام → تاريخ الانتهاء = البداية + (المدة - 1)
 */
export function getTaskStartDate(task) {
  return parseLocalDate(task?.dueDate);
}

export function getTaskEndDate(task) {
  const start = getTaskStartDate(task);
  if (!start) return null;
  const duration = Math.max(1, Number(task.duration) || 1);
  const end = new Date(start);
  end.setDate(end.getDate() + (duration - 1));
  return end;
}

export function getTaskEndISO(task) {
  const end = getTaskEndDate(task);
  return end ? toLocalISO(end) : '';
}

/** متأخرة فقط إذا انتهى تاريخ الانتهاء قبل اليوم ولم تُنجز */
export function isTaskOverdue(task) {
  if (!task || task.completed) return false;
  const end = getTaskEndDate(task);
  if (!end) return false;
  const today = startOfToday();
  return end < today;
}

/** عرض التاريخ كرقم فقط — بدون أمس/بكرة/اليوم */
export function formatDate(dateStr) {
  if (!dateStr || dateStr === 'غير محدد') return 'بدون تاريخ';
  try {
    const d = parseLocalDate(dateStr);
    if (!d) return 'بدون تاريخ';
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
  } catch (e) {
    return 'بدون تاريخ';
  }
}

/** عرض بداية–نهاية للمهام متعددة الأيام */
export function formatTaskSchedule(task) {
  if (!task?.dueDate) return 'بدون تاريخ';
  const start = task.dueDate;
  const duration = Math.max(1, Number(task.duration) || 1);
  if (duration <= 1) return formatDate(start);
  const endIso = getTaskEndISO(task);
  return `${formatDate(start)} → ${formatDate(endIso)}`;
}

/** مفتاح فرز زمني للمهام داخل البطاقة */
export function taskScheduleSortKey(task) {
  // المنجزة في الأسفل
  if (task.completed) {
    const end = getTaskEndDate(task);
    return { bucket: 100, time: end ? end.getTime() : 0 };
  }
  const start = getTaskStartDate(task);
  const end = getTaskEndDate(task);
  if (!start) return { bucket: 50, time: Infinity }; // بدون تاريخ — بعد المؤرّخة المعلقة
  const today = startOfToday();
  if (end && end < today) return { bucket: 0, time: start.getTime() }; // متأخرة أولاً
  return { bucket: 10, time: start.getTime() }; // اليوم ثم بكرة ثم لاحقاً
}

export function compareTasksBySchedule(a, b) {
  const ka = taskScheduleSortKey(a);
  const kb = taskScheduleSortKey(b);
  if (ka.bucket !== kb.bucket) return ka.bucket - kb.bucket;
  if (ka.time !== kb.time) return ka.time - kb.time;
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
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
  const d = startOfToday();
  const current = d.getDay();
  let add = (targetDay - current + 7) % 7;
  if (add === 0) add = 7;
  d.setDate(d.getDate() + add);
  return d;
}

function parseNumericDate(text) {
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) d.setFullYear(year + 1);
      return d;
    }
  }
  return null;
}

export function parseSmartInput(text) {
  let dueDate = '';
  let title = text;
  const today = startOfToday();

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
