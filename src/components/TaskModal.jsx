import { useEffect, useState } from 'react';

const WEEK_DAYS = [
  { id: 0, label: 'أحد' },
  { id: 1, label: 'إثنين' },
  { id: 2, label: 'ثلاثاء' },
  { id: 3, label: 'أربعاء' },
  { id: 4, label: 'خميس' },
  { id: 5, label: 'جمعة' },
  { id: 6, label: 'سبت' },
];

const EMPTY_FORM = {
  title: '',
  quadrant: 'important-urgent',
  dueDate: '',
  notes: '',
  duration: 1,
  recurrence: null,
  recurrenceDays: [],
};

export default function TaskModal({ isOpen, task, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        quadrant: task.quadrant,
        dueDate: task.dueDate || '',
        notes: task.notes || '',
        duration: task.duration || 1,
        recurrence: task.recurrence || null,
        recurrenceDays: task.recurrenceDays || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayId) => {
    setForm((f) => {
      const has = f.recurrenceDays.includes(dayId);
      const recurrenceDays = has
        ? f.recurrenceDays.filter((d) => d !== dayId)
        : [...f.recurrenceDays, dayId].sort();
      return { ...f, recurrenceDays };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    onSave(
      {
        ...form,
        title,
        duration: parseInt(form.duration, 10) || 1,
        recurrence: form.recurrence || null,
        recurrenceDays: form.recurrence === 'weekly' ? form.recurrenceDays : [],
      },
      task?.id ?? null
    );
  };

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box card">
        <div className="modal-header">
          <h3>{task ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
          <button type="button" className="btn-icon" onClick={onClose}>
            <i className="ph ph-x" style={{ fontSize: 20 }}></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label>عنوان المهمة</label>
            <input
              type="text"
              className="form-input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="form-field">
            <label>التصنيف</label>
            <select
              className="form-input"
              value={form.quadrant}
              onChange={(e) => setForm({ ...form, quadrant: e.target.value })}
            >
              <option value="important-urgent">مهم ومستعجل</option>
              <option value="important-not-urgent">مهم غير مستعجل</option>
              <option value="not-important-urgent">غير مهم ومستعجل</option>
              <option value="not-important-not-urgent">غير مهم غير مستعجل</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-field" style={{ flex: 1 }}>
              <label>الموعد</label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label>المدة (أيام)</label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>
          </div>

          <div className="form-field">
            <label>التكرار</label>
            <div className="recurrence-options">
              {[
                { id: null, label: 'مرة واحدة' },
                { id: 'daily', label: 'يومياً' },
                { id: 'weekly', label: 'أسبوعياً' },
              ].map((opt) => (
                <button
                  key={String(opt.id)}
                  type="button"
                  className={`chip-btn ${(form.recurrence || null) === opt.id ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, recurrence: opt.id })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {form.recurrence === 'weekly' && (
              <div className="weekday-picks">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={`chip-btn ${form.recurrenceDays.includes(d.id) ? 'active' : ''}`}
                    onClick={() => toggleDay(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-field">
            <label>ملاحظات</label>
            <textarea
              className="form-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              حفظ
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
