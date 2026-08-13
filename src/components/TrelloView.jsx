import { useState } from 'react';
import TaskCard from './TaskCard';
import { getTrelloWorkflowSummary, trelloStatusLabel } from '../utils/trelloWorkflow';

const QUADRANTS = [
  { id: 'important-urgent', label: 'مهم ومستعجل' },
  { id: 'important-not-urgent', label: 'مهم غير مستعجل' },
  { id: 'not-important-urgent', label: 'غير مهم ومستعجل' },
  { id: 'not-important-not-urgent', label: 'غير مهم غير مستعجل' },
];

function AttachmentLinks({ task }) {
  const attachments = task.externalMeta?.attachments || [];
  if (!attachments.length) return null;
  return (
    <div className="trello-attachments">
      <span className="trello-muted" style={{ marginLeft: 6 }}>
        <i className="ph ph-paperclip"></i> مرفقات:
      </span>
      {attachments.map((attachment) => (
        <a
          key={attachment.id || attachment.url}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="trello-link"
          title={attachment.name}
        >
          {attachment.name || 'مرفق'}
        </a>
      ))}
    </div>
  );
}

function TrelloTaskRow({
  task,
  onToggleComplete,
  onSetStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onMoveTask,
  workDays,
  showQuadrantSelect,
}) {
  return (
    <div className="trello-inbox-item">
      <TaskCard
        task={task}
        onToggleComplete={onToggleComplete}
        onSetStatus={onSetStatus}
        onToggleSubtask={onToggleSubtask}
        onEdit={onEdit}
        onDelete={onDelete}
        draggable={false}
        workDays={workDays}
      />
      <div className="trello-item-meta">
        {task.externalUrl && (
          <a href={task.externalUrl} target="_blank" rel="noreferrer" className="trello-link">
            <i className="ph ph-arrow-square-out"></i>
            فتح في تريلو
          </a>
        )}
        <AttachmentLinks task={task} />
        {showQuadrantSelect && (
          <select
            className="form-input trello-quad-select"
            value={task.quadrant}
            onChange={(event) => onMoveTask(task.id, event.target.value)}
            title="نقل إلى ربع"
          >
            {QUADRANTS.map((quadrant) => (
              <option key={quadrant.id} value={quadrant.id}>
                {quadrant.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function WorkflowMap({ lists }) {
  const workflow = getTrelloWorkflowSummary(lists);
  if (!workflow.length) return null;

  return (
    <div className="trello-workflow" aria-label="خريطة سير عمل Trello">
      <div className="trello-workflow-title">
        <i className="ph ph-arrows-left-right"></i>
        كيف يقرأ مَهَد قوائم هذا الـ Board
      </div>
      <div className="trello-workflow-items">
        {workflow.map((item) => (
          <span className={`trello-workflow-item status-${item.status}`} key={item.id}>
            <strong>{item.name}</strong>
            <i className="ph ph-arrow-left"></i>
            {trelloStatusLabel(item.status)}
          </span>
        ))}
      </div>
      <p className="trello-muted">
        نقل حالة البطاقة من مَهَد ينقلها إلى أول قائمة مطابقة. الأرشفة وحدها تغلق البطاقة في Trello.
      </p>
    </div>
  );
}

function ConnectionForm({ onSave }) {
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSave = async (event) => {
    event.preventDefault();
    if (!apiKey.trim() || !token.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      await onSave(apiKey, token);
      setApiKey('');
      setToken('');
    } catch (error) {
      console.error(error);
      setFormError(error?.message || 'فشل الربط');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="trello-form">
      <p className="trello-muted" style={{ marginBottom: 16 }}>
        أنشئ API Key وToken مفوضًا من حسابك في Trello، ثم اختر Board واحدًا ليكون مساحة عمل مَهَد
        في هذه النسخة. لا تُضمّن الـ Token في المشروع أو Git.
      </p>
      <div className="form-field">
        <label>API Key</label>
        <input
          type="password"
          className="form-input"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          autoComplete="off"
          required
        />
      </div>
      <div className="form-field">
        <label>Token (وليس Secret)</label>
        <input
          type="password"
          className="form-input"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
          required
        />
      </div>
      {formError && (
        <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }} role="alert">
          {formError}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={saving}>
        {saving ? 'جاري التحقق…' : 'التحقق والربط'}
      </button>
    </form>
  );
}

export default function TrelloView({
  tasks,
  trello,
  onToggleComplete,
  onSetStatus,
  onToggleSubtask,
  onEdit,
  onDelete,
  onMoveTask,
  workDays,
}) {
  const trelloTasks = tasks.filter((task) => task.externalSource === 'trello');
  const inbox = trelloTasks.filter((task) => !task.completed && !task.archived);
  const doneFromTrello = trelloTasks.filter((task) => task.completed || task.archived);

  return (
    <div className="trello-page">
      <div className="page-header">
        <h1 className="page-title">تريلو</h1>
        <p className="page-desc">
          هذه نسخة Trello-first: الـ Board المختار هو مصدر مهامك المؤقت. تُحفظ مواضع مصفوفة مَهَد
          محليًا في هذا المتصفح إلى أن نضيف طبقة بيانات مَهَد المستقلة.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="kpi-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ph ph-plugs-connected"></i>
          ربط مساحة Trello
        </h2>

        {!trello.isConnected ? (
          <ConnectionForm onSave={trello.saveCredentials} />
        ) : (
          <div className="trello-connected">
            <div className="trello-status-row">
              <span className="connection-dot"></span>
              <span>مرتبط بحساب {trello.member?.fullName || trello.member?.username || 'Trello'}</span>
              {trello.config?.lastSyncAt && (
                <span className="trello-muted">
                  آخر تحديث: {new Date(trello.config.lastSyncAt).toLocaleString('ar-EG')}
                </span>
              )}
            </div>

            <div className="form-field" style={{ marginTop: 16 }}>
              <label>Board المصدر</label>
              <select
                className="form-input"
                value={trello.config?.boardId || ''}
                onChange={(event) => event.target.value && trello.selectBoard(event.target.value)}
                disabled={trello.loading || trello.syncing}
              >
                <option value="">اختر Board</option>
                {trello.boards.map((board) => (
                  <option key={board.id} value={board.id}>
                    {board.name}
                  </option>
                ))}
              </select>
            </div>

            {trello.isBoardSelected && (
              <div className="form-field" style={{ marginTop: 12 }}>
                <label>القائمة الافتراضية للمهام الجديدة</label>
                <select
                  className="form-input"
                  value={trello.config?.defaultListId || ''}
                  onChange={(event) => trello.setDefaultList(event.target.value)}
                  disabled={trello.loading || trello.syncing}
                >
                  <option value="">اختر قائمة</option>
                  {trello.lists.filter((list) => !list.closed).map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {trello.isBoardSelected && <WorkflowMap lists={trello.lists} />}

            <div className="trello-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn-primary"
                disabled={!trello.isBoardSelected || trello.syncing}
                onClick={() => trello.syncNow()}
              >
                <i className={`ph ${trello.syncing ? 'ph-spinner' : 'ph-arrows-clockwise'}`}></i>
                {trello.syncing ? 'جاري التحديث…' : 'تحديث البطاقات'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => trello.reload()}>
                تحديث الـ Boards
              </button>
              <button type="button" className="btn-secondary" onClick={() => trello.disconnect()}>
                قطع الربط
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="kpi-section-title" style={{ marginBottom: 16 }}>
          بطاقات الـ Board المفتوحة
          <span className="q-count" style={{ marginRight: 10 }}>
            {inbox.length}
          </span>
        </h2>

        {inbox.length === 0 ? (
          <div className="empty-state">
            {trello.isBoardSelected
              ? 'لا توجد بطاقات مفتوحة في الـ Board المختار. استخدم «تحديث البطاقات» بعد التعديل في Trello.'
              : 'اربط Trello واختر Board أولاً.'}
          </div>
        ) : (
          <div className="trello-inbox-list">
            {inbox.map((task) => (
              <TrelloTaskRow
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onSetStatus={onSetStatus}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveTask={onMoveTask}
                workDays={workDays}
                showQuadrantSelect
              />
            ))}
          </div>
        )}
      </div>

      {doneFromTrello.length > 0 && (
        <div className="card">
          <h2 className="kpi-section-title">
            بطاقات مغلقة أو مؤرشفة
            <span className="q-count" style={{ marginRight: 10 }}>
              {doneFromTrello.length}
            </span>
          </h2>
          <p className="trello-muted" style={{ marginBottom: 12 }}>
            إكمال أو أرشفة المهمة في مَهَد يغلق البطاقة في Trello. يمكن استعادتها من الأرشيف.
          </p>
          <div className="trello-inbox-list">
            {doneFromTrello.map((task) => (
              <TrelloTaskRow
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onSetStatus={onSetStatus}
                onToggleSubtask={onToggleSubtask}
                onEdit={onEdit}
                onDelete={onDelete}
                onMoveTask={onMoveTask}
                workDays={workDays}
                showQuadrantSelect={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
