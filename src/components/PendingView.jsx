import { useMemo, useState } from 'react';
import TaskRow from './TaskRow';
import EmptyState from './EmptyState';
import {
  compareTasksBySchedule,
  getOccurrenceDates,
  getTaskStartDate,
  isTaskOverdue,
  parseLocalDate,
  startOfToday,
  toLocalISO,
} from '../utils/dateUtils';
import { isEffectivelyOpen } from '../utils/taskStatus';

const QUADRANTS = [
  { id: 'important-urgent', label: 'مهم ومستعجل', color: 'var(--danger)' },
  { id: 'important-not-urgent', label: 'مهم غير مستعجل', color: 'var(--accent)' },
  { id: 'not-important-urgent', label: 'غير مهم ومستعجل', color: 'var(--warning)' },
  { id: 'not-important-not-urgent', label: 'غير مهم غير مستعجل', color: 'var(--q4)' },
];

const DATE_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'overdue', label: 'متأخر' },
  { id: 'yesterday', label: 'أمس' },
  { id: 'today', label: 'اليوم' },
  { id: 'tomorrow', label: 'غداً' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'nextweek', label: 'الأسبوع القادم' },
  { id: 'nodate', label: 'بدون تاريخ' },
  { id: 'range', label: 'نطاق' },
];

const TIME_GROUPS = [
  { id: 'overdue', title: 'متأخرة' },
  { id: 'today', title: 'اليوم' },
  { id: 'tomorrow', title: 'غداً' },
  { id: 'later', title: 'لاحقاً' },
  { id: 'nodate', title: 'بدون تاريخ' },
];

function hasOccurrenceInRange(task, fromDate, toDate, workDays) {
  return getOccurrenceDates(task, fromDate, toDate, { workDays }).length > 0;
}

function assignTimeBucket(task, today, workDays) {
  if (isTaskOverdue(task, { workDays })) return 'overdue';
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (!getTaskStartDate(task) && !task.recurrence) return 'nodate';
  if (hasOccurrenceInRange(task, today, today, workDays)) return 'today';
  if (hasOccurrenceInRange(task, tomorrow, tomorrow, workDays)) return 'tomorrow';
  return 'later';
}

export default function PendingView({
  tasks,
  onToggleComplete,
  onSetStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onReschedule,
  workDays,
  workspaces = null,
}) {
  const [qFilter, setQFilter] = useState('all');
  const [dFilter, setDFilter] = useState('all');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  const today = startOfToday();

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => isEffectivelyOpen(t));

    if (qFilter !== 'all') {
      list = list.filter((t) => t.quadrant === qFilter);
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

    if (dFilter === 'overdue') list = list.filter((t) => isTaskOverdue(t, { workDays }));
    else if (dFilter === 'today') list = list.filter((t) => hasOccurrenceInRange(t, today, today, workDays));
    else if (dFilter === 'tomorrow')
      list = list.filter((t) => hasOccurrenceInRange(t, tomorrow, tomorrow, workDays));
    else if (dFilter === 'yesterday')
      list = list.filter((t) => hasOccurrenceInRange(t, yesterday, yesterday, workDays));
    else if (dFilter === 'week')
      list = list.filter((t) => hasOccurrenceInRange(t, weekStart, weekEnd, workDays));
    else if (dFilter === 'nextweek')
      list = list.filter((t) => hasOccurrenceInRange(t, nextWeekStart, nextWeekEnd, workDays));
    else if (dFilter === 'nodate') list = list.filter((t) => !getTaskStartDate(t));
    else if (dFilter === 'range' && rangeFrom && rangeTo) {
      const from = parseLocalDate(rangeFrom) || today;
      const to = parseLocalDate(rangeTo) || today;
      list = list.filter((t) => hasOccurrenceInRange(t, from, to, workDays));
    }

    return [...list].sort((a, b) => compareTasksBySchedule(a, b, { workDays }));
  }, [tasks, qFilter, dFilter, rangeFrom, rangeTo, today, workDays]);

  const groups = useMemo(() => {
    const map = {};
    filtered.forEach((t) => {
      const b = assignTimeBucket(t, today, workDays);
      if (!map[b]) map[b] = [];
      map[b].push(t);
    });
    return TIME_GROUPS.map((g) => ({ ...g, items: map[g.id] || [] })).filter((g) => g.items.length > 0);
  }, [filtered, today, workDays]);

  return (
    <div className="pending-view">
      <div className="pending-filters card">
        <div className="pending-filter-row">
          <span className="pending-filter-label">التصنيف</span>
          <div className="filter-chips">
            <button
              type="button"
              className={`filter-chip ${qFilter === 'all' ? 'active' : ''}`}
              onClick={() => setQFilter('all')}
            >
              الكل
            </button>
            {QUADRANTS.map((q) => (
              <button
                key={q.id}
                type="button"
                className={`filter-chip ${qFilter === q.id ? 'active' : ''}`}
                onClick={() => setQFilter(q.id)}
              >
                <span className="filter-chip-dot" style={{ background: q.color }} />
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <div className="pending-filter-row">
          <span className="pending-filter-label">التاريخ</span>
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
          {dFilter === 'range' && (
            <div className="filter-range-inputs">
              <input type="date" className="form-input" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
              <span>—</span>
              <input type="date" className="form-input" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      <p className="pending-count-hint">{filtered.length} مهمة</p>

      {filtered.length === 0 ? (
        <EmptyState
          icon="ph-check-circle"
          title="لا مهام معلقة"
          description="كل المهام المفتوحة منجزة أو خارج عوامل التصفية."
        />
      ) : (
        <div className="pending-groups">
          {groups.map((g) => (
            <section key={g.id} className="pending-group">
              <h3 className="pending-group-title">{g.title}</h3>
              <div className="pending-group-list">
                {g.items.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggleComplete={onToggleComplete}
                    onSetStatus={onSetStatus}
                    onToggleSubtask={onToggleSubtask}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReschedule={onReschedule}
                    workspaces={workspaces}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
