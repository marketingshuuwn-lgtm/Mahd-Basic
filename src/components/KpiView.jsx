import { useMemo, useState } from 'react';
import { TASK_CONTEXTS } from '../utils/taskMeta';

const Q_NAMES = {
  'important-urgent': 'مهم ومستعجل',
  'important-not-urgent': 'مهم غير مستعجل',
  'not-important-urgent': 'غير مهم ومستعجل',
  'not-important-not-urgent': 'غير مهم غير مستعجل',
};
const Q_COLORS = {
  'important-urgent': 'var(--danger)',
  'important-not-urgent': 'var(--accent)',
  'not-important-urgent': 'var(--warning)',
  'not-important-not-urgent': 'var(--text-secondary)',
};
const QUADRANTS = Object.keys(Q_NAMES);

const PERIODS = [
  { id: 'today', label: 'اليوم' },
  { id: 'week', label: 'هذا الأسبوع' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'all', label: 'الكل' },
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isInPeriod(dateStr, period) {
  if (!dateStr) return period === 'all';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const today = startOfDay(now);

  if (period === 'all') return true;
  if (period === 'today') {
    return startOfDay(d).getTime() === today.getTime();
  }
  if (period === 'week') {
    const start = new Date(today);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }
  if (period === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

export default function KpiView({ tasks }) {
  const [period, setPeriod] = useState('week');

  const stats = useMemo(() => {
    const completedInPeriod = tasks.filter(
      (t) => t.completed && isInPeriod(t.completedAt || t.createdAt, period)
    );
    const createdInPeriod = tasks.filter((t) => isInPeriod(t.createdAt, period));
    const pending = tasks.filter((t) => !t.completed);
    const overdue = pending.filter(
      (t) => t.dueDate && new Date(t.dueDate + 'T00:00:00') < startOfDay(new Date())
    );

    const total = period === 'all' ? tasks.length : createdInPeriod.length;
    const done = completedInPeriod.length;
    const percent = total > 0 ? Math.round((done / Math.max(total, done)) * 100) : 0;

    // completion rate among tasks that exist in period scope
    const scopeTotal = period === 'all' ? tasks.length : Math.max(createdInPeriod.length, done);
    const completionRate = scopeTotal > 0 ? Math.round((done / scopeTotal) * 100) : 0;

    return {
      total: period === 'all' ? tasks.length : createdInPeriod.length,
      done,
      pending: pending.length,
      overdue: overdue.length,
      completionRate,
      completedInPeriod,
    };
  }, [tasks, period]);

  const periodLabel = PERIODS.find((p) => p.id === period)?.label || '';

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div className="page-title">التقارير والإحصائيات</div>
          <div className="page-desc">لوحة تحليل الأداء — الفترة الحالية: {periodLabel}</div>
        </div>
        <div className="period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`period-tab ${period === p.id ? 'active' : ''}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-grid">
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <i className="ph ph-list-bullets"></i>
          </div>
          <div>
            <div className="stat-label">مهام الفترة ({periodLabel})</div>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <i className="ph ph-check-circle"></i>
          </div>
          <div>
            <div className="stat-label">منجز خلال الفترة</div>
            <div className="stat-value">{stats.done}</div>
          </div>
        </div>
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <i className="ph ph-hourglass"></i>
          </div>
          <div>
            <div className="stat-label">معلقة حالياً</div>
            <div className="stat-value">{stats.pending}</div>
          </div>
        </div>
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <i className="ph ph-warning"></i>
          </div>
          <div>
            <div className="stat-label">متأخرة</div>
            <div className="stat-value">{stats.overdue}</div>
          </div>
        </div>
      </div>

      <div className="kpi-row">
        <div className="card kpi-ring-card">
          <h3 className="kpi-section-title">نسبة الإنجاز — {periodLabel}</h3>
          <div className="kpi-ring-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" fill="none" stroke="var(--border-color)" strokeWidth="10" />
              <circle
                cx="70"
                cy="70"
                r="58"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 58}`}
                strokeDashoffset={`${2 * Math.PI * 58 * (1 - stats.completionRate / 100)}`}
                transform="rotate(-90 70 70)"
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="kpi-ring-label">
              <span className="kpi-ring-value">{stats.completionRate}%</span>
              <span className="kpi-ring-sub">منجز</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <h3 className="kpi-section-title">التوزيع حسب الأولوية (كل المهام)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {QUADRANTS.map((q) => {
              const qTasks = tasks.filter((t) => t.quadrant === q).length;
              const qDone = tasks.filter((t) => t.quadrant === q && t.completed).length;
              const qPercent = tasks.length > 0 ? (qTasks / tasks.length) * 100 : 0;
              return (
                <div key={q}>
                  <div className="dist-row">
                    <span>{Q_NAMES[q]}</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                      {qDone}/{qTasks}
                    </span>
                  </div>
                  <div className="dist-bar-bg">
                    <div
                      className="dist-bar-fill"
                      style={{ width: `${qPercent}%`, background: Q_COLORS[q] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <h3 className="kpi-section-title" style={{ marginTop: 26 }}>
            التوزيع حسب المساحة
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {TASK_CONTEXTS.map((ctx) => {
              const cTasks = tasks.filter((t) => (t.context || 'work') === ctx.id).length;
              const cDone = tasks.filter((t) => (t.context || 'work') === ctx.id && t.completed).length;
              const cPercent = tasks.length > 0 ? (cTasks / tasks.length) * 100 : 0;
              return (
                <div key={ctx.id}>
                  <div className="dist-row">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <i className={`ph ${ctx.icon}`}></i>
                      {ctx.label}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                      {cDone}/{cTasks}
                    </span>
                  </div>
                  <div className="dist-bar-bg">
                    <div
                      className="dist-bar-fill"
                      style={{ width: `${cPercent}%`, background: ctx.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="kpi-section-title">آخر المهام المنجزة في الفترة</h3>
        {stats.completedInPeriod.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}>لا توجد مهام منجزة في هذه الفترة</div>
        ) : (
          <div className="kpi-recent-list">
            {stats.completedInPeriod
              .slice()
              .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
              .slice(0, 8)
              .map((t) => (
                <div key={t.id} className="kpi-recent-item">
                  <i className="ph ph-check-circle" style={{ color: 'var(--success)' }}></i>
                  <span className="kpi-recent-title">{t.title}</span>
                  <span className="kpi-recent-meta">{Q_NAMES[t.quadrant]}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
