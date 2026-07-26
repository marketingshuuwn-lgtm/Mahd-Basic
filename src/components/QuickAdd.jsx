import { useState } from 'react';
import { parseSmartInput } from '../utils/dateUtils';

export default function QuickAdd({ onAddTask, onOpenAdvanced }) {
  const [quickValue, setQuickValue] = useState('');
  const [aiValue, setAiValue] = useState('');

  const submitQuick = (e) => {
    e.preventDefault();
    const value = quickValue.trim();
    if (!value) return;
    onAddTask(value, 'important-urgent', '', '', 1);
    setQuickValue('');
  };

  const runSmartParse = () => {
    const text = aiValue.trim();
    if (!text) return;
    const { title, dueDate } = parseSmartInput(text);
    onAddTask(title, 'important-urgent', dueDate, '', 1);
    setAiValue('');
  };

  return (
    <>
      <div className="card inbox-container">
        <div className="inbox-header">
          <i className="ph ph-tray" style={{ color: 'var(--accent)', fontSize: 20 }}></i>
          <span>إضافة سريعة</span>
        </div>
        <form className="inbox-form" onSubmit={submitQuick}>
          <input
            type="text"
            className="form-input"
            placeholder="اكتب عنوان المهمة..."
            value={quickValue}
            onChange={(e) => setQuickValue(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            <i className="ph ph-plus"></i> إضافة
          </button>
        </form>
        <button className="advanced-add-btn" onClick={onOpenAdvanced}>
          <i className="ph ph-sliders"></i> إعدادات متقدمة
        </button>
      </div>

      <div className="card ai-assistant-container">
        <div className="inbox-header">
          <i className="ph ph-sparkle" style={{ color: 'var(--accent)', fontSize: 20 }}></i>
          <span>المساعد الذكي (اكتب نصاً وسيقوم بإنشاء المهمة)</span>
        </div>
        <div className="ai-input-wrapper">
          <i className="ph ph-magic-wand ai-icon"></i>
          <input
            type="text"
            className="form-input ai-input"
            placeholder="مثال: اجتماع طارئ بكرة مع الإدارة..."
            value={aiValue}
            onChange={(e) => setAiValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') runSmartParse();
            }}
          />
          <button className="btn-primary" onClick={runSmartParse}>
            <i className="ph ph-lightning"></i> حلل
          </button>
        </div>
        <div className="ai-suggestion">
          * المساعد يتعرف تلقائياً على كلمات مثل (اليوم، بكرة، غداً، بعد أسبوع) ويستخرج التاريخ.
        </div>
      </div>
    </>
  );
}
