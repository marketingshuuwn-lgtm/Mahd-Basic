import { useState, useEffect, useMemo } from 'react';
import { notify } from '../hooks/useLocalNotifications';

const PHRASES_KEY = 'mahd_motivation_phrases_v1';
const ACHIEVEMENT_KEY = 'mahd_small_achievement_v1';

const DEFAULT_PHRASES = [
  'كل خطوة صغيرة تقربك من هدف كبير.',
  'اليوم بدايتك، غداً إنجازك.',
  'الاستمرار أهم من الكمال.',
  'أنت تبني شيئاً رائعاً — لا تستعجل.',
];

function loadPhrases() {
  try {
    const raw = localStorage.getItem(PHRASES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_PHRASES;
  } catch {
    return DEFAULT_PHRASES;
  }
}

function calculateStreak(tasks) {
  const completedDates = new Set(
    tasks
      .filter((t) => t.completed && t.completedAt)
      .map((t) => new Date(t.completedAt).toISOString().split('T')[0])
  );
  const sorted = Array.from(completedDates).sort().reverse();
  let streak = 0;
  const todayStr = new Date().toISOString().split('T')[0];
  let check = todayStr;
  // إذا لم يكن اليوم موجوداً، نبدأ من الأمس
  if (!completedDates.has(check)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    check = yesterday.toISOString().split('T')[0];
  }
  for (let i = 0; ; i++) {
    const d = new Date(check);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    if (completedDates.has(iso)) streak++;
    else break;
  }
  return streak;
}

export default function MotivationView({ tasks }) {
  const [phrases, setPhrases] = useState(loadPhrases);
  const [newPhrase, setNewPhrase] = useState('');
  const [achievementText, setAchievementText] = useState('');
  const [achievedToday, setAchievedToday] = useState(false);

  useEffect(() => {
    localStorage.setItem(PHRASES_KEY, JSON.stringify(phrases));
  }, [phrases]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ACHIEVEMENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const todayStr = new Date().toISOString().split('T')[0];
        setAchievedToday(parsed?.date === todayStr);
        setAchievementText(parsed?.text || '');
      }
    } catch {
      // ignore
    }
  }, []);

  const streak = useMemo(() => calculateStreak(tasks || []), [tasks]);

  const addPhrase = () => {
    const text = newPhrase.trim();
    if (!text) return;
    setPhrases((prev) => [...prev, text]);
    setNewPhrase('');
  };

  const removePhrase = (idx) => {
    setPhrases((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSmallAchievement = () => {
    const text = achievementText.trim() || 'أنجزت خطوة صغيرة اليوم';
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify({ date: todayStr, text }));
    setAchievedToday(true);
    setAchievementText(text);
    notify('مهد — إنجاز صغير', text);
  };

  const randomPhrase = useMemo(() => {
    if (phrases.length === 0) return DEFAULT_PHRASES[0];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }, [phrases]);

  const completedToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (tasks || []).filter(
      (t) => t.completed && t.completedAt && t.completedAt.startsWith(todayStr)
    ).length;
  }, [tasks]);

  return (
    <div>
      <div className="page-header">
        <div className="page-title">مساحة التحفيز</div>
        <div className="page-desc">تتبع الإنجاز واحصل على دفعة صغيرة كل يوم</div>
      </div>

      <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Streak + Today */}
        <section className="card settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <i className="ph ph-fire"></i>
            </div>
            <div>
              <h2 className="settings-title">الاستمرارية</h2>
              <p className="settings-desc">سلسلة الإنجازات من المهام المكتملة</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)' }}>
              {streak}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>يوم متتالي</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                {completedToday > 0 ? `${completedToday} مهمة مكتملة اليوم` : 'لا مهام مكتملة بعد'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 16, background: 'var(--accent-light)', borderRadius: 12 }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--accent)', textAlign: 'center' }}>
              {randomPhrase}
            </p>
          </div>
        </section>

        {/* Small Achievement */}
        <section className="card settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <i className="ph ph-check-circle"></i>
            </div>
            <div>
              <h2 className="settings-title">إنجاز صغير اليوم</h2>
              <p className="settings-desc">سجّل خطوة صغيرة — لا تحتاج قاعدة بيانات</p>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <textarea
              className="form-input"
              rows={2}
              placeholder="ماذا أنجزت اليوم؟"
              value={achievementText}
              onChange={(e) => setAchievementText(e.target.value)}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleSmallAchievement}
              disabled={achievedToday}
              style={{ marginTop: 10, width: '100%' }}
            >
              <i className="ph ph-check-circle"></i>
              {achievedToday ? 'تم تسجيل الإنجاز اليوم' : 'أنجزت شيء صغير اليوم'}
            </button>
            {achievedToday && (
              <p style={{ fontSize: 12, color: 'var(--success)', marginTop: 8 }}>
                ✅ تم تسجيل الإنجاز لهذا اليوم
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Custom Phrases */}
      <section className="card settings-card" style={{ marginTop: 24 }}>
        <div className="settings-card-head">
          <div className="settings-icon">
            <i className="ph ph-quotes"></i>
          </div>
          <div>
            <h2 className="settings-title">عبارات تحفيزية</h2>
            <p className="settings-desc">عبارات قابلة للتخصيص محلياً — تُحفظ في المتصفح فقط</p>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              className="form-input"
              placeholder="أضف عبارة جديدة..."
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addPhrase(); }}
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-secondary" onClick={addPhrase}>
              <i className="ph ph-plus"></i> إضافة
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {phrases.map((phrase, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'var(--hover-bg)',
                  padding: '6px 10px',
                  borderRadius: 20,
                  fontSize: 13,
                  border: '1px solid var(--border-color)',
                }}
              >
                <span>{phrase}</span>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => removePhrase(idx)}
                  title="حذف"
                  style={{ fontSize: 10, padding: 0, width: 16, height: 16 }}
                >
                  <i className="ph ph-x"></i>
                </button>
              </span>
            ))}
          </div>
          {phrases.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              لا توجد عبارات بعد. أضف عبارة تحفيزية جديدة.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
