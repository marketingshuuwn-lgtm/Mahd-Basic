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

export default function KpiView({ tasks }) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pending = total - done;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">التقارير والإحصائيات</div>
        <div className="page-desc">مؤشرات الأداء لإنجازاتك.</div>
      </div>

      <div className="stats-grid">
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <i className="ph ph-list-bullets"></i>
          </div>
          <div>
            <div className="stat-label">إجمالي المهام</div>
            <div className="stat-value">{total}</div>
          </div>
        </div>
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <i className="ph ph-check-circle"></i>
          </div>
          <div>
            <div className="stat-label">المهام المنجزة</div>
            <div className="stat-value">{done}</div>
          </div>
        </div>
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <i className="ph ph-hourglass"></i>
          </div>
          <div>
            <div className="stat-label">المهام المعلقة</div>
            <div className="stat-value">{pending}</div>
          </div>
        </div>
        <div className="card stat-item">
          <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <i className="ph ph-trend-up"></i>
          </div>
          <div>
            <div className="stat-label">نسبة الإنجاز</div>
            <div className="stat-value">{percent}%</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>توزيع المهام حسب الأولوية</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {QUADRANTS.map((q) => {
            const qTasks = tasks.filter((t) => t.quadrant === q).length;
            const qPercent = total > 0 ? (qTasks / total) * 100 : 0;
            return (
              <div key={q}>
                <div className="dist-row">
                  <span>{Q_NAMES[q]}</span>
                  <span>{qTasks} مهمة</span>
                </div>
                <div className="dist-bar-bg">
                  <div
                    className="dist-bar-fill"
                    style={{ width: `${qPercent}%`, background: Q_COLORS[q] }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
