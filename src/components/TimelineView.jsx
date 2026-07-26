import { formatDate } from '../utils/dateUtils';
import TaskCard from './TaskCard';

export default function TimelineView({ tasks, onToggleComplete, onEdit, onDelete }) {
  const groups = {};
  tasks.forEach((t) => {
    const key = t.dueDate || 'غير محدد';
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (a === 'غير محدد') return 1;
    if (b === 'غير محدد') return -1;
    return new Date(a) - new Date(b);
  });

  return (
    <div className="card">
      {sortedKeys.length === 0 ? (
        <div className="empty-state">لا توجد مهام لعرضها في الخط الزمني</div>
      ) : (
        sortedKeys.map((key) => (
          <div key={key} className="timeline-group">
            <div className="timeline-date">
              <i className="ph ph-calendar"></i> {formatDate(key)}
            </div>
            <div className="timeline-tasks">
              {groups[key].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onToggleComplete={onToggleComplete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
