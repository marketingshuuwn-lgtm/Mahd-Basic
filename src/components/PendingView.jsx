import TaskCard from './TaskCard';

export default function PendingView({ tasks, onToggleComplete, onEdit, onDelete }) {
  const pending = tasks.filter((t) => !t.completed);
  return (
    <div>
      <div className="page-header">
        <div className="page-title">المهام المعلقة</div>
        <div className="page-desc">عرض جميع المهام غير المنجزة.</div>
      </div>
      <div className="card">
        {pending.length === 0 ? (
          <div className="empty-state">
            <i
              className="ph ph-check-circle"
              style={{ fontSize: 48, color: 'var(--success)', marginBottom: 16, display: 'block' }}
            ></i>
            لا توجد مهام معلقة. كل شيء تحت السيطرة!
          </div>
        ) : (
          pending.map((task) => (
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
