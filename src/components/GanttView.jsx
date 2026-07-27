import { useMemo, useState } from 'react';
import { getTaskStartDate, toLocalISO } from '../utils/dateUtils';

const DAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export default function GanttView({ tasks, onToggleComplete, onEdit, onReschedule }) {
  const [dragId, setDragId] = useState(null);
  const [overDay, setOverDay] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        return { iso: toLocalISO(d), date: d };
      }),
    [today]
  );

  // مهام تتقاطع مع نافذة العرض (بداية أو جزء من المدة داخل 14 يوماً)
  const rows = tasks
    .filter((t) => t.dueDate)
    .map((t) => {
      const start = getTaskStartDate(t);
      if (!start) return null;
      const duration = Math.max(1, Number(t.duration) || 1);
      const end = new Date(start);
      end.setDate(start.getDate() + duration - 1);
      const windowEnd = new Date(today);
      windowEnd.setDate(today.getDate() + 13);
      if (end < today || start > windowEnd) return null;
      const startOffset = Math.round((start - today) / 86400000);
      const visibleStart = Math.max(0, startOffset);
      const visibleEnd = Math.min(13, Math.round((end - today) / 86400000));
      const visibleLen = Math.max(1, visibleEnd - visibleStart + 1);
      return { task: t, visibleStart, visibleLen, startOffset };
    })
    .filter(Boolean);

  const dropOn = (e, iso) => {
    e.preventDefault();
    e.stopPropagation();
    const raw = e.dataTransfer.getData('text/plain') || String(dragId || '');
    setDragId(null);
    setOverDay(null);
    if (!raw) return;
    onReschedule(raw, iso);
  };

  return (
    <div className="card gantt-card">
      <p className="gantt-hint">
        <i className="ph ph-hand-grabbing"></i>
        الشريط = من تاريخ البداية بطول المدة — اسحبه إلى يوم لتغيير البداية
      </p>

      <div className="gantt-scroll">
        <div className="gantt-table" style={{ minWidth: 1100 }}>
          <div className="gantt-head" style={{ gridTemplateColumns: `200px repeat(${days.length}, 1fr)` }}>
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
            <div className="empty-state">لا مهام مجدولة في الأسابيع الظاهرة</div>
          )}

          {rows.map(({ task, visibleStart, visibleLen }) => (
            <div
              key={task.id}
              className="gantt-line"
              style={{ gridTemplateColumns: '200px 1fr' }}
            >
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

              <div
                className="gantt-days-track"
                style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
              >
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
                    {i === visibleStart && (
                      <div
                        className={`gantt-pill ${task.quadrant} ${task.completed ? 'done' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(task.id));
                          e.dataTransfer.effectAllowed = 'move';
                          setDragId(task.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverDay(null);
                        }}
                        style={{
                          width: `calc(${visibleLen * 100}% - 6px)`,
                        }}
                        title="اسحب لتغيير تاريخ البداية"
                      >
                        {task.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
