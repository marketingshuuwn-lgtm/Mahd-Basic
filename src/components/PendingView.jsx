import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';

const QUADRANTS = [
  { id: 'all', label: 'الكل' },
  { id: 'important-urgent', label: 'مهم ومستعجل', color: 'var(--danger)' },
  { id: 'important-not-urgent', label: 'مهم غير مستعجل', color: 'var(--accent)' },
  { id: 'not-important-urgent', label: 'غير مهم ومستعجل', color: 'var(--warning)' },
  { id: 'not-important-not-urgent', label: 'غير مهم غير مستعجل', color: 'var(--text-secondary)' },
];

const DATE_FILTERS = [
  { id: 'all', label: 'كل التواريخ' },
  { id: 'overdue', label: 'متأخرة' },
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'nodate', label: 'بدون تاريخ' },
];

const SORTS = [
  { id: 'date-asc', label: 'الأقرب أولاً' },
  { id: 'date-desc', label: 'الأبعد أولاً' },
  { id: 'quadrant', label: 'حسب التصنيف' },
  { id: 'title', label: 'أبجدياً' },
];

export default function PendingView({ tasks, onToggleComplete, onEdit, onDelete }) {
  const [qFilter, setQFilter] = useState('all');
  const [dFilter, setDFilter] = useState('all');
  const [sort, setSort] = useState('date-asc');

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => !t.completed);

    if (qFilter !== 'all') {
      list = list.filter((t) => t.quadrant === qFilter);
    }

    if (dFilter === 'overdue') {
      list = list.filter((t) => t.dueDate && new Date(t.dueDate + 'T00:00:00') < today);
    } else if (dFilter === 'today') {
      const iso = today.toISOString().split('T')[0];
      list = list.filter((t) => t.dueDate === iso);
    } else if (dFilter === 'week') {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      list = list.filter((t) => {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate + 'T00:00:00');
        return d >= today && d < end;
      });
    } else if (dFilter === 'nodate') {
      list = list.filter((t) => !t.dueDate);
    }

    const qOrder = {
      'important-urgent': 0,
      'important-not-urgent': 1,
      'not-important-urgent': 2,
      'not-important-not-urgent': 3,
    };

    list = [...list].sort((a, b) => {
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '', 'ar');
      if (sort === 'quadrant') return (qOrder[a.quadrant] ?? 9) - (qOrder[b.quadrant] ?? 9);
      // date
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return sort === 'date-desc' ? db - da : da - db;
    });

    return list;
  }, [tasks, qFilter, dFilter, sort, today]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">المهام المعلقة</div>
        <div className="page-desc">فرز وتصفية المهام غير المنجزة حسب التصنيف والتاريخ.</div>
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
              >
                {q.color && (
                  <span className="filter-chip-dot" style={{ background: q.color }} />
                )}
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

        <div className="filter-group">
          <span className="filter-label">الترتيب</span>
          <select
            className="form-input filter-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="pending-count-hint">
          {filtered.length} مهمة
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <i
              className="ph ph-check-circle"
              style={{ fontSize: 48, color: 'var(--success)', marginBottom: 16, display: 'block' }}
            ></i>
            لا توجد مهام مطابقة للفلاتر الحالية
          </div>
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
