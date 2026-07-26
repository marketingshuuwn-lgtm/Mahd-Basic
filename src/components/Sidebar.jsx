import { useRef, useState } from 'react';

const NAV_ITEMS = [
  { id: 'Matrix', label: 'مصفوفة الأولويات', icon: 'ph-squares-four' },
  { id: 'Pending', label: 'المهام المعلقة', icon: 'ph-hourglass' },
  { id: 'Kpi', label: 'التقارير والإحصائيات', icon: 'ph-chart-bar' },
];

export default function Sidebar({
  view,
  onSwitchView,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  pendingCount,
  totalCount,
  connected,
  onExport,
  onImportFile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div className="logo-area">
        <div className="logo-icon">
          <i className="ph ph-tree-evergreen"></i>
        </div>
        <div className="logo-text">مهد</div>
      </div>

      <nav>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'active' : ''}`}
            onClick={() => {
              onSwitchView(item.id);
              onClose();
            }}
          >
            <i className={`ph ${item.icon}`}></i>
            {item.label}
            {item.id === 'Pending' && pendingCount > 0 && (
              <span className="nav-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="connection-status">
          <span className={`connection-dot ${connected ? '' : 'offline'}`}></span>
          {connected ? 'متصل بقاعدة البيانات' : 'غير متصل'}
        </div>

        <button type="button" className="theme-toggle-btn" onClick={onToggleTheme}>
          <span>{theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
          <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`}></i>
        </button>

        <div className="data-actions">
          <button
            type="button"
            className="data-btn"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className="ph ph-download-simple"></i> تصدير
          </button>
          <button
            type="button"
            className="data-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <i className="ph ph-upload-simple"></i> استيراد
          </button>
          {/* مخفي تماماً — لا يظهر نص المتصفح الافتراضي */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
            }}
          />
          {menuOpen && (
            <div className="dropdown-menu">
              <button
                type="button"
                onClick={() => {
                  onExport('csv');
                  setMenuOpen(false);
                }}
              >
                CSV
              </button>
              <button
                type="button"\)n                onClick={() => {
                  onExport('xlsx');
                  setMenuOpen(false);
                }}
              >
                Excel
              </button>
            </div>
          )}
        </div>

        <div className="sidebar-total">إجمالي المهام: {totalCount}</div>
      </div>
    </aside>
  );
}
