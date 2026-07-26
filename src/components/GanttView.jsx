import { useState } from 'react';

const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function GanttView({ tasks, onToggleComplete, onEdit, onReschedule }) {
  const [dragOverDate, setDragOverDate] = useState(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const tasksWithDates = tasks.filter((t) => t.dueDate && new Date(t.dueDate) >= today);

  return (
    <div className="card">
      <div className="gantt-container">
        <div className="gantt-grid-wrapper">
          <div className="gantt-header">
            <div></div>
            {days.map((d) => (
              <div key={d} className="gantt-day-col">
                {DAY_NAMES[new Date(d).getDay()]}
                <br />
                {new Date(d).getDate()}/{new Date(d).getMonth() + 1}
              </div>
            ))}
          </div>
          <div className="gantt-rows-area">
            <div className="gantt-drop-overlay">
              <div></div>
              {days.map((d) => (
                <div
                  key={d}
                  className={`gantt-drop-zone ${dragOverDate === d ? 'drag-over' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDate(d);
                  }}
                  onDragLeave={() => setDragOverDate(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverDate(null);
                    const id = Number(e.dataTransfer.getData('text/plain'));
                    if (id) onReschedule(id, d);
                  }}
                ></div>
              ))}
            </div>

            {tasksWithDates.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                لا توجد مهام مجدولة للأسبوع القادم لعرضها في مخطط جانت
              </div>
            ) : (
              tasksWithDates.map((task) => {
                const taskDate = new Date(task.dueDate + 'T00:00:00');
                const diffDays = Math.round((taskDate - today) / 86400000);
                if (diffDays < 0 || diffDays >= 7) return null;
                const duration = task.duration || 1;
                const widthPercent = Math.max(duration * (100 / 7) - 1, 5);
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
                        className={`gantt-bar ${task.quadrant} ${task.completed ? 'completed' : ''}`}
                        draggable="true"
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', String(task.id));
                          e.stopPropagation();
                        }}
                        style={{ right: `${rightPercent}%`, width: `${widthPercent}%` }}
                        onClick={() => onEdit(task.id)}
                        title={task.title}
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
