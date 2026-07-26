export function formatDate(dateStr) {
  if (!dateStr) return 'غير محدد';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(new Date().toDateString());
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return 'اليوم';
    if (diff === 1) return 'بكرة';
    if (diff === -1) return 'أمس';
    return d.toLocaleDateString('ar-EG');
  } catch (e) {
    return 'غير محدد';
  }
}

// يحلل نصاً حراً بالعربي ويستخرج منه عنوان المهمة وتاريخ استحقاقها إن وجد
export function parseSmartInput(text) {
  let dueDate = '';
  let title = text;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  if (text.includes('اليوم')) {
    dueDate = today.toISOString().split('T')[0];
    title = text.replace('اليوم', '').trim();
  } else if (text.includes('بكرة') || text.includes('غدا')) {
    dueDate = tomorrow.toISOString().split('T')[0];
    title = text.replace(/بكرة|غدا/g, '').trim();
  } else if (text.includes('بعد أسبوع')) {
    dueDate = nextWeek.toISOString().split('T')[0];
    title = text.replace('بعد أسبوع', '').trim();
  }
  title = title.replace(/^[-,،\s]+|[-,،\s]+$/g, '');
  return { title, dueDate };
}
