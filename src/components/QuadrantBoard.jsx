import { useState } from 'react';
import TaskCard from './TaskCard';

const QUADRANTS = [
  { id: 'important-urgent', title: 'مهم ومستعجل', color: 'var(--danger)' },
  { id: 'important-not-urgent', title: 'مهم غير مستعجل', color: 'var(--accent)' },
  { id: 'not-important-urgent', title: 'غير مهم ومستعجل', color: 'var(--warning)' },
  { id: 'not-important-not-urgent', title: 'غير مهم غير مستعجل', color: 'var(--text-secondary)' },
];

export default function QuadrantBoard({ tasks, onToggleComplete, onEdit, onDelete, onMoveTask }) {
  // null = كلها مفتوحة، أو id للربع المطوي
  const [collapsed, setCollapsed] = useState({});
  const [dragOverZone, setDragOverZone] = useState(null);

  const toggleCollapse = (id) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAll = () => {
    const next = {};
    QUADRANTS.forEach((q) => { next[q.id] = true; });
    setCollapsed(next);
  };

  const expandAll = () => setCollapsed({});

  const anyCollapsed = QUADRANTS.some((q) => collapsed[q.id]);

  return (
    <div>
      <div className="board-toolbar">
        <button type="button" className="toolbar-btn" onClick={anyCollapsed ? expandAll : collapseAll}>
          <i className={`ph ${anyCollapsed ? 'ph-arrows-out-simple' : 'ph-arrows-in-simple'}`}></i>
          {anyCollapsed ? 'توسيع الكل' : 'طي الكل'}
        </button>
      </div>

      <div className="matrix-grid">
        {QUADRANTS.map((q) => {
          const items = tasks.filter((t) => t.quadrant === q.id);
          const isCollapsed = !!collapsed[q.id];

          return (
            <div
              key={q.id}
              className={`card quadrant-card ${isCollapsed ? 'collapsed' : ''}`}
              data-quadrant={q.id}
            >
              <div className="accent-bar" style={{ background: q.color }}></div>
              <div className="quadrant-inner">
                <button
                  type="button"
                  className="quadrant-header quadrant-header-btn"
                  onClick={() => toggleCollapse(q.id)}
                  aria-expanded={!isCollapsed}
                >
                  <span className="q-dot" style={{ background: q.color }}></span>
                  <span className="q-title" style={{ color: q.color }}>
                    {q.title}
                  </span>
                  <span className="q-count">{items.length}</span>
                  <span className="collapse-indicator">
                    <i className={`ph ph-caret-${isCollapsed ? 'left' : 'down'}`}></i>
                  </span>
                </button>

                <div
                  className={`quadrant-body ${isCollapsed ? 'is-collapsed' : ''}`}
                >
                  <div
                    className={`drop-zone ${dragOverZone === q.id ? 'drag-over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverZone(q.id);
                    }}
                    onDragLeave={() => setDragOverZone(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverZone(null);
                      const raw = e.dataTransfer.getData('text/plain');
                      const id = Number(raw);
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
