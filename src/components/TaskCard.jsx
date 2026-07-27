import { formatTaskSchedule, isTaskOverdue } from '../utils/dateUtils';

export default function TaskCard({ task, onToggleComplete, onEdit, onDelete, draggable = true }) {
  const overdue = isTaskOverdue(task);

  return (
    <div
      className={`task-item ${task.completed ? 'completed' : ''} ${overdue ? 'overdue' : ''}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.effectAllowed = 'move';
        e.currentTarget.classList.add('dragging');
      }}
      onDragEnd={(e) => e.currentTarget.classList.remove('dragging')}
    >
      <div
        className={`task-checkbox ${task.completed ? 'checked' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}
      >
        {task.completed && <i className="ph ph-check" style={{ fontSize: 14 }}></i>}
      </div>
      <div className="task-content" onClick={() => onEdit(task.id)}>
        <div className="task-title">{task.title}</div>
        <div className={`task-deadline ${overdue ? 'is-overdue' : ''}`}>
          <i className="ph ph-calendar-blank"></i> {formatTaskSchedule(task)}
          {overdue && <span className="overdue-tag">متأخرة</span>}
        </div>
        {task.notes && (
          <div className="task-notes">
            <i className="ph ph-note-pencil"></i> {task.notes}
          </div>
        )}
      </div>
      <div className="task-actions" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn-icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task.id);
          }}
        >
          <i className="ph ph-pencil-simple"></i>
        </button>
        <button
          type="button"
          className="btn-icon danger"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
        >
          <i className="ph ph-trash"></i>
        </button>
      </div>
    </div>
  );
}
