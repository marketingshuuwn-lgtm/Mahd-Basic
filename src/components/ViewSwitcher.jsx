const SUBVIEWS = [
  { id: 'Board', icon: 'ph-squares-four', label: 'لوحة المصفوفة' },
  { id: 'Timeline', icon: 'ph-list-dashes', label: 'الخط الزمني' },
  { id: 'Gantt', icon: 'ph-chart-bar-horizontal', label: 'مخطط جانت' },
];

export default function ViewSwitcher({ subview, onSwitch }) {
  return (
    <div className="view-switcher">
      {SUBVIEWS.map((s) => (
        <button
          key={s.id}
          className={`switcher-btn ${subview === s.id ? 'active' : ''}`}
          title={s.label}
          onClick={() => onSwitch(s.id)}
        >
          <i className={`ph ${s.icon}`}></i>
        </button>
      ))}
    </div>
  );
}
