import { ALL_WEEK_DAYS, DEFAULT_WORK_DAYS, WEEK_DAYS, formatWorkDays, normalizeWorkDays } from '../utils/taskMeta';

const PERMISSION_LABELS = {
  granted: 'مسموح',
  denied: 'محظور',
  default: 'لم يُطلب بعد',
  unsupported: 'غير مدعوم',
};

export default function SettingsView({
  workDays,
  onChangeWorkDays,
  notificationSettings,
  onChangeNotificationSettings,
  notificationPermission,
  onRequestNotificationPermission,
  onSendTestNotification,
  pushSupported,
  pushSubscribed,
  pushLoading,
  onSubscribePush,
  onUnsubscribePush,
  onSendTestPush,
}) {
  const normalizedWorkDays = normalizeWorkDays(workDays);
  const activeNotificationDays = normalizeWorkDays(notificationSettings?.activeDays || DEFAULT_WORK_DAYS);

  const setPreset = (days) => onChangeWorkDays(normalizeWorkDays(days));

  const toggleDay = (dayId) => {
    const hasDay = normalizedWorkDays.includes(dayId);
    const next = hasDay
      ? normalizedWorkDays.filter((d) => d !== dayId)
      : [...normalizedWorkDays, dayId].sort((a, b) => a - b);

    // لا نترك القائمة فارغة حتى لا تختفي كل المهام اليومية بالخطأ.
    if (next.length === 0) return;
    onChangeWorkDays(next);
  };

  const toggleNotificationDay = (dayId) => {
    const hasDay = activeNotificationDays.includes(dayId);
    const next = hasDay
      ? activeNotificationDays.filter((d) => d !== dayId)
      : [...activeNotificationDays, dayId].sort((a, b) => a - b);

    if (next.length === 0) return;
    onChangeNotificationSettings({ activeDays: next });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">الإعدادات</div>
        <div className="page-desc">ضبط السلوك العام لمهد — أيام العمل والتنبيهات المحلية</div>
      </div>

      <div className="settings-grid">
        <section className="card settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <i className="ph ph-calendar-check"></i>
            </div>
            <div>
              <h2 className="settings-title">أيام العمل</h2>
              <p className="settings-desc">
                المهام ذات التكرار اليومي تظهر فقط في هذه الأيام. الافتراضي: الأحد إلى الخميس.
              </p>
            </div>
          </div>

          <div className="weekday-settings">
            {WEEK_DAYS.map((day) => (
              <button
                key={day.id}
                type="button"
                className={`weekday-setting-btn ${normalizedWorkDays.includes(day.id) ? 'active' : ''}`}
                onClick={() => toggleDay(day.id)}
              >
                <span>{day.longLabel}</span>
                {normalizedWorkDays.includes(day.id) && <i className="ph ph-check"></i>}
              </button>
            ))}
          </div>

          <div className="settings-summary">
            <i className="ph ph-info"></i>
            أيام العمل الحالية: <strong>{formatWorkDays(normalizedWorkDays, { long: true })}</strong>
          </div>

          <div className="settings-actions">
            <button type="button" className="btn-secondary" onClick={() => setPreset(DEFAULT_WORK_DAYS)}>
              الأحد–الخميس
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPreset([0, 1, 2, 3, 4, 6])}>
              بدون الجمعة فقط
            </button>
            <button type="button" className="btn-secondary" onClick={() => setPreset(ALL_WEEK_DAYS)}>
              كل الأيام
            </button>
          </div>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <i className="ph ph-bell-ringing"></i>
            </div>
            <div>
              <h2 className="settings-title">التنبيهات</h2>
              <p className="settings-desc">
                تنبيهات محلية من المتصفح. تعمل بدقة جيدة عندما يكون تبويب مهد مفتوحاً.
              </p>
            </div>
          </div>

          <div className="settings-summary">
            <i className="ph ph-shield-check"></i>
            إذن المتصفح: <strong>{PERMISSION_LABELS[notificationPermission] || notificationPermission}</strong>
          </div>

          <div className="notification-master-row">
            <label className="toggle-line">
              <input
                type="checkbox"
                checked={!!notificationSettings?.enabled}
                disabled={notificationPermission !== 'granted'}
                onChange={(e) => onChangeNotificationSettings({ enabled: e.target.checked })}
              />
              <span>تفعيل التنبيهات المحلية</span>
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={onRequestNotificationPermission}
              disabled={notificationPermission === 'unsupported'}
            >
              <i className="ph ph-bell"></i>
              طلب الإذن
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onSendTestNotification}
              disabled={notificationPermission !== 'granted'}
            >
              تجربة
            </button>
          </div>

          <div className="notification-options">
            <label className="notification-option-row">
              <input
                type="checkbox"
                checked={!!notificationSettings?.morningSummary}
                onChange={(e) => onChangeNotificationSettings({ morningSummary: e.target.checked })}
              />
              <span>ملخص صباحي</span>
              <input
                type="time"
                className="form-input time-input"
                value={notificationSettings?.morningTime || '10:00'}
                onChange={(e) => onChangeNotificationSettings({ morningTime: e.target.value })}
              />
            </label>

            <label className="notification-option-row">
              <input
                type="checkbox"
                checked={!!notificationSettings?.eveningReview}
                onChange={(e) => onChangeNotificationSettings({ eveningReview: e.target.checked })}
              />
              <span>مراجعة مسائية</span>
              <input
                type="time"
                className="form-input time-input"
                value={notificationSettings?.eveningTime || '20:00'}
                onChange={(e) => onChangeNotificationSettings({ eveningTime: e.target.value })}
              />
            </label>
          </div>

          <div>
            <div className="filter-label">أيام تفعيل التنبيهات</div>
            <div className="weekday-settings compact-days">
              {WEEK_DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  className={`weekday-setting-btn ${activeNotificationDays.includes(day.id) ? 'active' : ''}`}
                  onClick={() => toggleNotificationDay(day.id)}
                >
                  <span>{day.label}</span>
                  {activeNotificationDays.includes(day.id) && <i className="ph ph-check"></i>}
                </button>
              ))}
            </div>
          </div>

          <p className="form-hint">
            هذي تنبيهات محلية تعمل فقط والتبويب مفتوح. لإشعارات تصل حتى والمتصفح مغلق، فعّل
            "إشعارات الدفع (Web Push)" أسفل.
          </p>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <div className="settings-icon">
              <i className="ph ph-broadcast"></i>
            </div>
            <div>
              <h2 className="settings-title">إشعارات الدفع (Web Push)</h2>
              <p className="settings-desc">
                تصل حتى لو كان المتصفح مغلقاً تماماً — تُرسل من خادم عبر Supabase Edge Function
                وتُعرض بواسطة Service Worker على جهازك.
              </p>
            </div>
          </div>

          <div className="settings-summary">
            <i className="ph ph-shield-check"></i>
            حالة هذا الجهاز:{' '}
            <strong>
              {!pushSupported
                ? 'غير مدعوم بهذا المتصفح'
                : pushSubscribed
                ? 'مفعّل ويستقبل الإشعارات'
                : 'غير مفعّل'}
            </strong>
          </div>

          <div className="notification-master-row">
            {!pushSubscribed ? (
              <button
                type="button"
                className="btn-primary"
                onClick={onSubscribePush}
                disabled={!pushSupported || pushLoading}
              >
                <i className="ph ph-bell-ringing"></i>
                تفعيل على هذا الجهاز
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={onUnsubscribePush} disabled={pushLoading}>
                <i className="ph ph-bell-slash"></i>
                إيقاف على هذا الجهاز
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={onSendTestPush}
              disabled={!pushSubscribed}
            >
              إرسال إشعار تجريبي
            </button>
          </div>

          <p className="form-hint">
            الملخص الصباحي (10:00) والمراجعة المسائية (20:00) يُرسلان تلقائياً عبر Web Push
            لكل الأجهزة المفعّلة، بغض النظر إذا كان المتصفح مفتوحاً أو لا.
          </p>
        </section>
      </div>
    </div>
  );
}
