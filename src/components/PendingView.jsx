import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';
import {
  getTaskEndDate,
  getTaskStartDate,
  isTaskOverdue,
  startOfToday,
  toLocalISO,
} from '../utils/dateUtils';

const QUADRANTS = [
  { id: 'all', label: 'الكل', color: '#111827' },
  { id: 'important-urgent', label: 'مهم ومستعجل', color: 'var(--danger)' },
  { id: 'important-not-urgent', label: 'مهم غير مستعجل', color: 'var(--accent)' },
  { id: 'not-important-urgent', label: 'غير مهم ومستعجل', color: 'var(--warning)' },
  { id: 'not-important-not-urgent', label: 'غير مهم غير مستعجل', color: 'var(--text-secondary)' },
];

const DATE_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'overdue', label: 'متأخر' },
  { id: 'yesterday', label: 'أمس' },
  { id: 'today', label: 'اليوم' },
  { id: 'tomorrow', label: 'غدا' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'nextweek', label: 'الأسبوع القادم' },
  { id: 'nodate', label: 'بدون تاريخ' },
];

export default function PendingView({ tasks, onToggleComplete, onEdit, onDelete }) {
  const [qFilter, setQFilter] = useState('all');
  const [dFilter, setDFilter] = useState('all');

  const today = useMemo(() => startOfToday(), []);
  const todayISO = toLocalISO(today);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => !t.completed);

    if (qFilter !== 'all') {
      list = list.filter((t) => t.quadrant === qFilter);
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = toLocalISO(yesterday);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = toLocalISO(tomorrow);

    // بداية الأسبوع (الأحد) ونهايته
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(12, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const nextWeekStart = new Date(weekEnd);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 7);

    if (dFilter === 'overdue') {
      list = list.filter((t) => isTaskOverdue(t));
    } else if (dFilter === 'yesterday') {
      list = list.filter((t) => t.dueDate === yesterdayISO);
    } else if (dFilter === 'today') {
      list = list.filter((t) => t.dueDate === todayISO);
    } else if (dFilter === 'tomorrow') {
      list = list.filter((t) => t.dueDate === tomorrowISO);
    } else if (dFilter === 'week') {
      list = list.filter((t) => {
        const s = getTaskStartDate(t);
        if (!s) return false;
        return s >= weekStart && s < weekEnd;
      });
    } else if (dFilter === 'nextweek') {
      list = list.filter((t) => {
        const s = getTaskStartDate(t);
        if (!s) return false;
        return s >= nextWeekStart && s < nextWeekEnd;
      });
    } else if (dFilter === 'nodate') {
      list = list.filter((t) => !t.dueDate);
    }

    // ترتيب: متأخر → حسب البداية
    list = [...list].sort((a, b) => {
      const ao = isTaskOverdue(a) ? 0 : 1;
      const bo = isTaskOverdue(b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      const sa = getTaskStartDate(a)?.getTime() ?? Infinity;
      const sb = getTaskStartDate(b)?.getTime() ?? Infinity;
      return sa - sb;
    });

    return list;
  }, [tasks, qFilter, dFilter, today, todayISO]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">المهام المعلقة</div>
        <div className="page-desc">تصفية حسب التصنيف والتاريخ — المتأخر يُحسب من تاريخ انتهاء المدة</div>
      </div>

      <div className="filter-bar card">
        <div className="filter-group">
          <span className="filter-label">التصنيف</span>
          <div className="filter-chips">
            {QUADRANTS.map((q) => (
              <button
                key={q.id}
                type="button"
                className={`filter-chip ${qFilter === q.id ? 'active' : ''}`}
                onClick={() => setQFilter(q.id)}
                title={q.label}
              >
                <span className="filter-chip-dot" style={{ background: q.color }} />
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">التاريخ</span>
          <div className="filter-chips">
            {DATE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-chip ${dFilter === f.id ? 'active' : ''}`}
                onClick={() => setDFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="pending-count-hint">{filtered.length} مهمة</div>
        {filtered.length === 0 ? (
          <div className="empty-state">لا توجد مهام مطابقة للفلاتر</div>
        ) : (
          filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              draggable={false}
            />
          ))
        )}
      </div>
    </div>
  );
}
