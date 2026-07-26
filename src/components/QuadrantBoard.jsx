import { useState } from 'react';
import TaskCard from './TaskCard';

const QUADRANTS = [
  { id: 'important-urgent', title: 'مهم ومستعجل', color: 'var(--danger)' },
  { id: 'important-not-urgent', title: 'مهم غير مستعجل', color: 'var(--accent)' },
  { id: 'not-important-urgent', title: 'غير مهم ومستعجل', color: 'var(--warning)' },
  { id: 'not-important-not-urgent', title: 'غير مهم غير مستعجل', color: 'var(--text-secondary)' },
];

export default function QuadrantBoard({ tasks, onToggleComplete, onEdit, onDelete, onMoveTask }) {
  const [collapsed, setCollapsed] = useState({});
  const [dragOverZone, setDragOverZone] = useState(null);

  return (
    <div className="matrix-grid">
      {QUADRANTS.map((q) => {
        const items = tasks.filter((t) => t.quadrant === q.id);
        const isCollapsed = collapsed[q.id];
        return (
          <div key={q.id} className={`card quadrant-card ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="accent-bar" style={{ background: q.color }}></div>
            <div className="quadrant-inner">
              <div className="quadrant-header">
                <span className="q-dot" style={{ background: q.color }}></span>
                <span className="q-title" style={{ color: q.color }}>
                  {q.title}
                </span>
                <span className="q-count">{items.length}</span>
                <button
                  className="collapse-btn"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                >
                  <i className={`ph ph-caret-${isCollapsed ? 'left' : 'down'}`}></i>
                </button>
              </div>
              <div
                className={`drop-zone ${dragOverZone === q.id ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverZone(q.id);
                }}
                onDragLeave={() => setDragOverZone(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverZone(null);
                  const id = Number(e.dataTransfer.getData('text/plain'));
                  if (id) onMoveTask(id, q.id);
                }}
              >
                {items.length === 0 ? (
                  <div className="empty-state">اسحب مهمة إلى هنا</div>
                ) : (
                  items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={onToggleComplete}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
