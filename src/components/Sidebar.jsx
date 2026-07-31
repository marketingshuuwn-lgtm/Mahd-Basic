import { useEffect, useRef, useState } from 'react';

/** ترتيب: مهام → معلقة → تقارير → استراحة → مفكرة → أرشيف → إعدادات (تريلو داخل الإعدادات) */
const NAV_ITEMS = [
  { id: 'Matrix', label: 'المهام', icon: 'ph-squares-four' },
  { id: 'Pending', label: 'المعلقة', icon: 'ph-hourglass' },
  { id: 'Kpi', label: 'التقارير', icon: 'ph-chart-bar' },
  { id: 'Motivation', label: 'استراحة', icon: 'ph-coffee', hint: 'Alt+G' },
  { id: 'Notepad', label: 'المفكرة', icon: 'ph-notebook' },
  { id: 'Archive', label: 'الأرشيف', icon: 'ph-archive' },
  { id: 'Settings', label: 'الإعدادات', icon: 'ph-gear-six' },
];

export default function Sidebar({
  view,
  onSwitchView,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  pendingCount,
  trelloCount,
  archiveCount = 0,
  totalCount,
  connected,
  onExport,
  onImportFile,
  compact,
  onToggleCompact,
}) {
  const [dataMenuOpen, setDataMenuOpen] = useState(false);
  const fileInputRef = useRef(null);
  const dataMenuRef = useRef(null);

  useEffect(() => {
    if (!dataMenuOpen) return;
    const close = (e) => {
      if (dataMenuRef.current && !dataMenuRef.current.contains(e.target)) {
        setDataMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dataMenuOpen]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className="sidebar-collapse-rail"
        title={compact ? 'توسيع الشريط' : 'طي الشريط — أيقونات فقط'}
        aria-label={compact ? 'توسيع الشريط' : 'طي الشريط'}
        aria-pressed={compact}
        onClick={onToggleCompact}
      >
        <i className={`ph ${compact ? 'ph-caret-left' : 'ph-caret-right'}`} aria-hidden="true"></i>
      </button>

      <div className="logo-area">
        <button
          type="button"
          className="logo-brand-btn"
          title={compact ? 'توسيع الشريط' : 'مهد'}
          onClick={() => {
            if (compact) onToggleCompact();
          }}
        >
          <div className="logo-icon">
            <img src="/logo.svg" alt="" className="logo-icon-img" />
          </div>
          {!compact && <div className="logo-text">مهد</div>}
        </button>
      </div>

      <nav aria-label="التنقل الرئيسي">
        {NAV_ITEMS.map((item) => {
          let badge = null;
          if (item.id === 'Pending' && pendingCount > 0) badge = pendingCount;
          else if (item.id === 'Settings' && trelloCount > 0) badge = trelloCount;
          else if (item.id === 'Archive' && archiveCount > 0) badge = archiveCount;
          const active = view === item.id;
          const title = item.hint ? `${item.label} (${item.hint})` : item.label;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${active ? 'active' : ''}`}
              title={title}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                onSwitchView(item.id);
                onClose();
              }}
            >
              <i className={`ph ${item.icon}`} aria-hidden="true"></i>
              {!compact && (
                <span className="nav-label">
                  {item.label}
                  {item.hint && <span className="nav-hint">{item.hint}</span>}
                </span>
              )}
              {badge != null && (
                <span className="nav-badge" aria-label={`${badge} عنصر`}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="connection-status" title={connected ? 'متصل' : 'غير متصل'}>
          <span className={`connection-dot ${connected ? '' : 'offline'}`}></span>
          {!compact && (connected ? 'متصل' : 'غير متصل')}
        </div>

        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
          aria-label={theme === 'dark' ? 'التبديل للنهاري' : 'التبديل لليلي'}
        >
          {!compact && <span>{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>}
          <i className={`ph ${theme === 'dark' ? 'ph-sun' : 'ph-moon'}`} aria-hidden="true"></i>
        </button>

        <div className="data-actions" ref={dataMenuRef}>
          <button
            type="button"
            className="data-btn data-btn-full"
            title="تنزيل أو رفع بيانات المساحة"
            aria-expanded={dataMenuOpen}
            onClick={() => setDataMenuOpen((v) => !v)}
          >
            <i className="ph ph-arrows-down-up" aria-hidden="true"></i>
            {!compact && 'تنزيل / رفع بيانات'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx"
            style={{ display: 'none' }}
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportFile(file);
              e.target.value = '';
              setDataMenuOpen(false);
            }}
          />
          {dataMenuOpen && (
            <div className="dropdown-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { onExport('csv'); setDataMenuOpen(false); }}>
                <i className="ph ph-download-simple"></i> تنزيل CSV
              </button>
              <button type="button" role="menuitem" onClick={() => { onExport('xlsx'); setDataMenuOpen(false); }}>
                <i className="ph ph-download-simple"></i> تنزيل Excel
              </button>
              <button type="button" role="menuitem" onClick={() => fileInputRef.current?.click()}>
                <i className="ph ph-upload-simple"></i> رفع ملف…
              </button>
            </div>
          )}
        </div>

        {!compact && <div className="sidebar-total">إجمالي: {totalCount}</div>}
      </div>
    </aside>
  );
}
