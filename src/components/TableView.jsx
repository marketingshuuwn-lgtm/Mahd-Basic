import { formatTaskSchedule, isTaskOverdue } from '../utils/dateUtils';
import { getSubtaskStats, normalizeSubtasks } from '../utils/subtasks';
import { normalizeTaskStatus } from '../utils/taskStatus';

const STATUS_META = {
  not_started: { label: 'لم تبدأ', className: 'not-started' },
  in_progress: { label: 'قيد التنفيذ', className: 'in-progress' },
  completed: { label: 'منجزة', className: 'completed' },
  deferred: { label: 'معلّقة', className: 'deferred' },
  cancelled: { label: 'ملغاة', className: 'cancelled' },
};

function TaskStatusPill({ task }) {
  const status = normalizeTaskStatus(task);
  const meta = STATUS_META[status] || STATUS_META.not_started;
  return <span className={`table-status-pill ${meta.className}`}>{meta.label}</span>;
}

export default function TableView({ tasks = [], onEdit, workDays }) {
  const sortedTasks = [...tasks].sort((a, b) => {
    const aDue = a.dueDate || '9999-12-31';
    const bDue = b.dueDate || '9999-12-31';
    return aDue.localeCompare(bDue, 'ar') || String(a.title).localeCompare(String(b.title), 'ar');
  });

  if (sortedTasks.length === 0) {
    return (
      <div className="table-view-empty">
        <i className="ph ph-table" />
        <h2>لا توجد بطاقات في هذا المشروع</h2>
        <p>أضف بطاقة إلى الـ Board النشط في Trello لتظهر هنا وفي بقية العروض.</p>
      </div>
    );
  }

  return (
    <section className="table-view" aria-label="جدول مهام المشروع">
      <div className="table-view-heading">
        <div>
          <span className="eyebrow"><i className="ph ph-table" /> جدول المشروع</span>
          <p>{sortedTasks.length} بطاقة من Board Trello النشط. اضغط صف المهمة لفتح تفاصيلها.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">المهمة</th>
              <th scope="col">القائمة</th>
              <th scope="col">الحالة</th>
              <th scope="col">الموعد</th>
              <th scope="col">القائمة الفرعية</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => {
              const subtasks = getSubtaskStats(normalizeSubtasks(task.subtasks));
              const overdue = isTaskOverdue(task, { workDays });
              return (
                <tr key={task.id} className={overdue ? 'is-overdue' : ''}>
                  <td>
                    <button type="button" className="table-task-title" onClick={() => onEdit?.(task.id)}>
                      <span>{task.title}</span>
                      {task.externalSource === 'trello' && <i className="ph ph-arrow-square-out" title="بطاقة Trello" />}
                    </button>
                  </td>
                  <td>
                    <span className="table-list-pill">
                      <i className="ph ph-kanban" /> {task.externalMeta?.listName || 'غير معروفة'}
                    </span>
                  </td>
                  <td><TaskStatusPill task={task} /></td>
                  <td>
                    <span className={overdue ? 'table-due overdue' : 'table-due'}>
                      {formatTaskSchedule(task, { workDays })}
                    </span>
                  </td>
                  <td>
                    {subtasks.total ? (
                      <span className="table-subtasks">{subtasks.completed}/{subtasks.total}</span>
                    ) : (
                      <span className="table-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
