import { useMemo, useState } from 'react';
import TaskCard from './TaskCard';

const QUADRANTS = [
  { id: 'important-urgent', title: 'مهم ومستعجل', color: 'var(--danger)' },
  { id: 'important-not-urgent', title: 'مهم غير مستعجل', color: 'var(--accent)' },
  { id: 'not-important-urgent', title: 'غير مهم ومستعجل', color: 'var(--warning)' },
  { id: 'not-important-not-urgent', title: 'غير مهم غير مستعجل', color: 'var(--text-secondary)' },
];

function parseDragId(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isNaN(n) ? raw : n;
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export default function QuadrantBoard({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onMoveTask,
  onReorderInQuadrant,
}) {
  const [collapsed, setCollapsed] = useState({});
  const [dragOverZone, setDragOverZone] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);

  const byQ = useMemo(() => {
    const map = {};
    QUADRANTS.forEach((q) => {
      map[q.id] = sortItems(tasks.filter((t) => t.quadrant === q.id));
    });
    return map;
  }, [tasks]);

  const toggleCollapse = (id) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));
  const anyCollapsed = QUADRANTS.some((q) => collapsed[q.id]);
  const collapseAll = () => {
    const n = {};
    QUADRANTS.forEach((q) => {
      n[q.id] = true;
    });
    setCollapsed(n);
  };
  const expandAll = () => setCollapsed({});

  const handleDropOnZone = (e, qId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone(null);
    setDragOverTaskId(null);
    const id = parseDragId(e.dataTransfer.getData('text/plain'));
    if (id == null) return;

    const task = tasks.find((t) => String(t.id) === String(id));
    if (!task) return;

    // إسقاط فوق مهمة أخرى داخل نفس الربع = إعادة ترتيب
    if (dragOverTaskId && task.quadrant === qId && onReorderInQuadrant) {
      const list = byQ[qId].map((t) => t.id);
      const from = list.findIndex((x) => String(x) === String(id));
      const to = list.findIndex((x) => String(x) === String(dragOverTaskId));
      if (from >= 0 && to >= 0 && from !== to) {
        const next = [...list];
        next.splice(from, 1);
        next.splice(to, 0, id);
        onReorderInQuadrant(qId, next);
        return;
      }
    }

    if (task.quadrant !== qId) onMoveTask(id, qId);
  };

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
          const items = byQ[q.id];
          const isCollapsed = !!collapsed[q.id];

          return (
            <div key={q.id} className={`card quadrant-card ${isCollapsed ? 'collapsed' : ''}`}>
              <div className="accent-bar" style={{ background: q.color }}></div>
              <div className={`quadrant-inner ${isCollapsed ? 'inner-collapsed' : ''}`}>
                <button
                  type="button"
                  className="quadrant-header-btn"
                  onClick={() => toggleCollapse(q.id)}
                >
                  <span className="q-dot" style={{ background: q.color }}></span>
                  <span className="q-title" style={{ color: q.color }}>
                    {q.title}
                  </span>
                  <span className="q-count">{items.length}</span>
                  <span className="collapse-indicator">
                    <i className={`ph ${isCollapsed ? 'ph-caret-left' : 'ph-caret-down'}`}></i>
                  </span>
                </button>

                {!isCollapsed && (
                  <div
                    className={`drop-zone ${dragOverZone === q.id ? 'drag-over' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverZone(q.id);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDragOverZone(null);
                        setDragOverTaskId(null);
                      }
                    }}
                    onDrop={(e) => handleDropOnZone(e, q.id)}
                  >
                    {items.length === 0 ? (
                      <div className="empty-state">اسحب مهمة إلى هنا</div>
                    ) : (
                      items.map((task) => (
                        <div
                          key={task.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverTaskId(task.id);
                            setDragOverZone(q.id);
                          }}
                          className={dragOverTaskId === task.id ? 'task-drop-target' : ''}
                        >
                          <TaskCard
                            task={task}
                            onToggleComplete={onToggleComplete}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
