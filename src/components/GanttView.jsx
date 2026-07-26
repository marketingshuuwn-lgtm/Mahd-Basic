import { useMemo, useState } from 'react';
import { toLocalISO } from '../utils/dateUtils';

const DAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function GanttView({ tasks, onToggleComplete, onEdit, onReschedule }) {
  const [dragId, setDragId] = useState(null);
  const [overDay, setOverDay] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return { iso: toLocalISO(d), date: d };
      }),
    [today]
  );

  const rows = tasks
    .filter((t) => t.dueDate)
    .map((t) => {
      const d = new Date(t.dueDate + 'T12:00:00');
      const diff = Math.round((d - today) / 86400000);
      return { task: t, diff };
    })
    .filter((r) => r.diff >= 0 && r.diff < 7);

  const onDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    // بعض المتصفحات تحتاج setDragImage أو تأخير بسيط
    requestAnimationFrame(() => setDragId(id));
  };

  const onDragEnd = () => {
    setDragId(null);
    setOverDay(null);
  };

  const dropOn = (e, iso) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData('text/plain') || String(dragId || '');
    if (!raw) return;
    onReschedule(raw, iso);
    setDragId(null);
    setOverDay(null);
  };

  return (
    <div className="card gantt-card">
      <p className="gantt-hint">
        <i className="ph ph-hand-grabbing"></i>
        اسحب الشريط الملون وأفلته فوق عمود اليوم — أو انقر اليوم ثم أكّد
      </p>

      <div className="gantt-scroll">
        <div className="gantt-table">
          <div className="gantt-head">
            <div className="gantt-name-col">المهمة</div>
            {days.map(({ iso, date }) => (
              <div
                key={iso}
                className={`gantt-day-head ${overDay === iso ? 'is-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setOverDay(iso);
                }}
                onDragLeave={() => setOverDay((d) => (d === iso ? null : d))}
                onDrop={(e) => dropOn(e, iso)}
              >
                <span>{DAY_NAMES[date.getDay()]}</span>
                <small>
                  {date.getDate()}/{date.getMonth() + 1}
                </small>
              </div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="empty-state">لا مهام مجدولة خلال الأيام السبعة القادمة</div>
          )}

          {rows.map(({ task, diff }) => {
            const dur = Math.min(task.duration || 1, 7 - diff);
            return (
              <div key={task.id} className="gantt-line">
                <div className="gantt-name-col">
                  <button
                    type="button"
                    className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                    style={{ width: 18, height: 18 }}
                    onClick={() => onToggleComplete(task.id)}
                  >
                    {task.completed && <i className="ph ph-check" style={{ fontSize: 10 }}></i>}
                  </button>
                  <button type="button" className="gantt-title-btn" onClick={() => onEdit(task.id)}>
                    {task.title}
                  </button>
                </div>

                <div className="gantt-days-track">
                  {days.map(({ iso }, i) => (
                    <div
                      key={iso}
                      className={`gantt-cell ${overDay === iso && dragId ? 'is-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setOverDay(iso);
                      }}
                      onDrop={(e) => dropOn(e, iso)}
                    >
                      {i === diff && (
                        <div
                          className={`gantt-pill ${task.quadrant} ${task.completed ? 'done' : ''}`}
                          draggable
                          onDragStart={(e) => onDragStart(e, task.id)}
                          onDragEnd={onDragEnd}
                          style={{ width: `calc(${dur * 100}% - 6px)` }}
                          title="اسحب لتغيير اليوم"
                        >
                          {task.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
