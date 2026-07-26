import { useMemo, useState } from 'react';
import { toLocalISO } from '../utils/dateUtils';

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function parseDragId(raw) {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? raw : n;
}

export default function GanttView({ tasks, onToggleComplete, onEdit, onReschedule }) {
  const [dragOverDate, setDragOverDate] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

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
        return toLocalISO(d);
      }),
    [today]
  );

  const tasksWithDates = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate + 'T12:00:00');
    return d >= today;
  });

  const handleDropOnDay = (e, day) => {
    e.preventDefault();
    e.stopPropagation();
    const id = parseDragId(e.dataTransfer.getData('text/plain'));
    setDragOverDate(null);
    setDraggingId(null);
    if (id != null && id !== '') onReschedule(id, day);
  };

  return (
    <div className="card">
      <div className="gantt-hint">
        <i className="ph ph-hand-grabbing"></i>
        اسحب شريط المهمة وأفلته على عمود اليوم لتغيير التاريخ
      </div>
      <div className="gantt-container">
        <div className="gantt-grid-wrapper">
          <div className="gantt-header">
            <div className="gantt-corner"></div>
            {days.map((d) => {
              const dd = new Date(d + 'T12:00:00');
              return (
                <div
                  key={d}
                  className={`gantt-day-col ${dragOverDate === d ? 'day-highlight' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverDate(d);
                  }}
                  onDrop={(e) => handleDropOnDay(e, d)}
                >
                  <span className="gantt-day-name">{DAY_NAMES[dd.getDay()]}</span>
                  <span className="gantt-day-num">
                    {dd.getDate()}/{dd.getMonth() + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={`gantt-rows-area ${draggingId ? 'is-dragging' : ''}`}>
            {draggingId && (
              <div className="gantt-drop-overlay">
                <div className="gantt-drop-spacer"></div>
                {days.map((d) => (
                  <div
                    key={d}
                    className={`gantt-drop-zone ${dragOverDate === d ? 'drag-over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverDate(d);
                    }}
                    onDrop={(e) => handleDropOnDay(e, d)}
                  />
                ))}
              </div>
            )}

            {tasksWithDates.length === 0 ? (
              <div className="empty-state">لا توجد مهام مجدولة للأسبوع القادم</div>
            ) : (
              tasksWithDates.map((task) => {
                const taskDate = new Date(task.dueDate + 'T12:00:00');
                const diffDays = Math.round((taskDate - today) / 86400000);
                if (diffDays < 0 || diffDays >= 7) return null;
                const duration = Math.min(task.duration || 1, 7 - diffDays);
                const widthPercent = Math.max(duration * (100 / 7) - 1.5, 8);
                const rightPercent = diffDays * (100 / 7);

                return (
                  <div key={task.id} className="gantt-row">
                    <div className="gantt-task-name">
                      <div
                        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                        style={{ width: 18, height: 18 }}
                        onClick={() => onToggleComplete(task.id)}
                      >
                        {task.completed && <i className="ph ph-check" style={{ fontSize: 10 }}></i>}
                      </div>
                      <span
                        onClick={() => onEdit(task.id)}
                        style={{
                          cursor: 'pointer',
                          textDecoration: task.completed ? 'line-through' : 'none',
                          opacity: task.completed ? 0.6 : 1,
                        }}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="gantt-bar-container">
                      <div
                        className={`gantt-bar ${task.quadrant} ${task.completed ? 'completed' : ''} ${draggingId === task.id ? 'is-dragging-bar' : ''}`}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(task.id));
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingId(task.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOverDate(null);
                        }}
                        style={{ right: `${rightPercent}%`, width: `${widthPercent}%` }}
                        onClick={() => onEdit(task.id)}
                        title={`${task.title} — اسحب لتغيير التاريخ`}
                      >
                        {task.title}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
