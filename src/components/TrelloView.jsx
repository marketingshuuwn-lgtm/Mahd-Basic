import { useState } from 'react';
import TaskCard from './TaskCard';

const QUADRANTS = [
  { id: 'important-urgent', label: 'مهم ومستعجل' },
  { id: 'important-not-urgent', label: 'مهم غير مستعجل' },
  { id: 'not-important-urgent', label: 'غير مهم ومستعجل' },
  { id: 'not-important-not-urgent', label: 'غير مهم غير مستعجل' },
];

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
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);

  const inbox = tasks.filter((t) => t.externalSource === 'trello' && !t.completed);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!apiKey.trim() || !token.trim()) return;
    setSaving(true);
    try {
      await trello.saveCredentials(apiKey, token);
      setApiKey('');
      setToken('');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="trello-page">
      <div className="page-header">
        <h1 className="page-title">تريلو</h1>
        <p className="page-desc">
          البطاقات المسندة إليك في تريلو تصل إلى مهد — مزامنة من تريلو → مهد فقط حالياً
        </p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 className="kpi-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="ph ph-plugs-connected"></i>
          الربط
        </h2>

        {trello.isConnected ? (
          <div className="trello-connected">
            <div className="trello-status-row">
              <span className="connection-dot"></span>
              <span>مرتبط بتريلو</span>
              {trello.config?.last_sync_at && (
                <span className="trello-muted">
                  آخر مزامنة:{' '}
                  {new Date(trello.config.last_sync_at).toLocaleString('ar-EG')}
                </span>
              )}
            </div>
            <div className="trello-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={trello.syncing}
                onClick={() => trello.syncNow()}
              >
                <i className={`ph ${trello.syncing ? 'ph-spinner' : 'ph-arrows-clockwise'}`}></i>
                {trello.syncing ? 'جاري المزامنة…' : 'مزامنة الآن'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => trello.disconnect()}>
                قطع الربط
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="trello-form">
            <p className="trello-muted" style={{ marginBottom: 16 }}>
              من{' '}
              <a href="https://trello.com/power-ups/admin" target="_blank" rel="noreferrer">
                Trello Power-Ups Admin
              </a>{' '}
              انسخ API Key ثم أنشئ Token والصقهما هنا. يُحفظان في Supabase.
            </p>
            <div className="form-field">
              <label>API Key</label>
              <input
                type="password"
                className="form-input"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="form-field">
              <label>Token</label>
              <input
                type="password"
                className="form-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'جاري التحقق…' : 'حفظ وربط'}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="kpi-section-title" style={{ marginBottom: 0 }}>
            وارد تريلو
            <span className="q-count" style={{ marginRight: 10 }}>
              {inbox.length}
            </span>
          </h2>
        </div>

        {inbox.length === 0 ? (
          <div className="empty-state">
            {trello.isConnected
              ? 'لا بطاقات مسندة إليك حالياً — اضغط «مزامنة الآن» بعد إسناد بطاقة في تريلو'
              : 'اربط تريلو أولاً ثم زامن'}
          </div>
        ) : (
          <div className="trello-inbox-list">
            {inbox.map((task) => (
              <div key={task.id} className="trello-inbox-item">
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
                  <select
                    className="form-input trello-quad-select"
                    value={task.quadrant}
                    onChange={(e) => onMoveTask(task.id, e.target.value)}
                    title="نقل إلى ربع"
                  >
                    {QUADRANTS.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
