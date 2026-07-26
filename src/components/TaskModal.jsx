import { useEffect, useState } from 'react';

const EMPTY_FORM = {
  title: '',
  quadrant: 'important-urgent',
  dueDate: '',
  notes: '',
  duration: 1,
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
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    onSave({ ...form, title, duration: parseInt(form.duration) || 1 }, task?.id ?? null);
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
          <button className="btn-icon" onClick={onClose}>
            <i className="ph ph-x" style={{ fontSize: 20 }}></i>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 15 }}>
              عنوان المهمة
            </label>
            <input
              type="text"
              className="form-input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 15 }}>
              التصنيف
            </label>
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

          <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 15 }}>
                الموعد (اختياري)
              </label>
              <input
                type="date"
                className="form-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 15 }}>
                المدة بالأيام (لجانت)
              </label>
              <input
                type="number"
                min="1"
                className="form-input"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, fontSize: 15 }}>
              ملاحظات (اختياري)
            </label>
            <textarea
              className="form-input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            ></textarea>
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
