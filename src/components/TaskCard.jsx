import { formatDate } from '../utils/dateUtils';

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete, draggable = true }) {
  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(task.id));
        e.currentTarget.classList.add('dragging');
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove('dragging')}
    >
      <div
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={() => onToggleComplete(task.id)}
      >
        {task.completed && <i className="ph ph-check" style={{ fontSize: 14 }}></i>}
      </div>
      <div className="task-content" onClick={() => onEdit(task.id)}>
        <div className="task-title">{task.title}</div>
        <div className="task-deadline">
          <i className="ph ph-calendar-blank"></i> {formatDate(task.dueDate)}
          {task.duration > 1 ? ` (المدة: ${task.duration} أيام)` : ''}
        </div>
        {task.notes && (
          <div className="task-notes">
            <i className="ph ph-note-pencil"></i> {task.notes}
          </div>
        )}
      </div>
      <div className="task-actions">
        <button className="btn-icon" onClick={() => onEdit(task.id)}>
          <i className="ph ph-pencil-simple"></i>
        </button>
        <button className="btn-icon danger" onClick={() => onDelete(task.id)}>
          <i className="ph ph-trash"></i>
        </button>
      </div>
    </div>
  );
}
