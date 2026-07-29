import { useEffect, useMemo, useRef, useState } from 'react';
import { ALL_WORKSPACES_ID, WORKSPACE_COLORS, WORKSPACE_ICONS } from '../utils/taskMeta';

function isSystemSpace(ws) {
  return ws?.id === 'work' || ws?.id === 'personal' || ws?.isDefault;
}

export default function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  onSwitch,
  onCreate,
  onUpdate,
  onArchiveSpace,
  onReorder,
  isAllMode,
}) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const [name, setName] = useState('');
  const [trait, setTrait] = useState('');
  const [icon, setIcon] = useState(WORKSPACE_ICONS[2]);
  const [colorIndex, setColorIndex] = useState(2);
  const menuRef = useRef(null);

  const editing = useMemo(
    () => workspaces.find((w) => w.id === editId) || null,
    [workspaces, editId]
  );

  useEffect(() => {
    if (!menuId) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuId]);

  const openEdit = (ws) => {
    setMenuId(null);
    setEditId(ws.id);
    setName(ws.label);
    setTrait(ws.trait || '');
    setIcon(ws.icon || WORKSPACE_ICONS[0]);
    const idx = WORKSPACE_COLORS.findIndex(
      (c) => c.color === ws.color || c.bg === ws.bg
    );
    setColorIndex(idx >= 0 ? idx : 0);
  };

  const submitCreate = (e) => {
    e?.preventDefault?.();
    const created = onCreate?.({ name, icon, colorIndex, trait });
    if (created) {
      setName('');
      setTrait('');
      setShowCreate(false);
    }
  };

  const submitEdit = (e) => {
    e?.preventDefault?.();
    if (!editId || !name.trim()) return;
    onUpdate?.(editId, {
      label: name.trim(),
      icon,
      colorIndex,
      trait: trait.trim(),
    });
    setEditId(null);
  };

  const handleArchive = () => {
    if (!editing || isSystemSpace(editing)) return;
    const ok = window.confirm(
      `أرشفة مساحة «${editing.label}»؟\n\nستُخفى من الشريط وتُؤرشف مهامها النشطة.\nلا يُحذف شيء من قاعدة البيانات.`
    );
    if (!ok) return;
    onArchiveSpace?.(editing.id);
    setEditId(null);
  };

  const activeWs = !isAllMode
    ? workspaces.find((w) => w.id === activeWorkspaceId)
    : null;

  return (
    <div className="workspace-switcher">
      <div className="workspace-tabs" role="tablist" aria-label="المساحات">
        <button
          type="button"
          role="tab"
          aria-selected={isAllMode}
          className={`workspace-tab workspace-all-tab ${isAllMode ? 'active' : ''}`}
          onClick={() => onSwitch(ALL_WORKSPACES_ID)}
          title="كل المساحات — عرض وتقارير شاملة"
        >
          <i className="ph ph-squares-four"></i>
          <span>الكل</span>
        </button>

        {workspaces.map((ws) => {
          const active = !isAllMode && ws.id === activeWorkspaceId;
          return (
            <div
              key={ws.id}
              className={`workspace-tab-wrap ${dragId === ws.id ? 'dragging' : ''} ${
                overId === ws.id ? 'drag-over' : ''
              }`}
              ref={menuId === ws.id ? menuRef : null}
              draggable
              onDragStart={(e) => {
                setDragId(ws.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragId && dragId !== ws.id) setOverId(ws.id);
              }}
              onDragLeave={() => setOverId((id) => (id === ws.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== ws.id) onReorder?.(dragId, ws.id);
                setDragId(null);
                setOverId(null);
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={active}
                className={`workspace-tab ${active ? 'active' : ''}`}
                style={{ '--ws-color': ws.color, '--ws-bg': ws.bg }}
                onClick={() => onSwitch(ws.id)}
                onDoubleClick={() => openEdit(ws)}
                title={ws.trait ? `${ws.label} — ${ws.trait}` : ws.label}
              >
                <i className={`ph ${ws.icon}`}></i>
                <span className="workspace-tab-label">{ws.label}</span>
                {active && (
                  <span
                    className="workspace-tab-more"
                    role="button"
                    tabIndex={0}
                    title="خيارات المساحة"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId((id) => (id === ws.id ? null : ws.id));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuId((id) => (id === ws.id ? null : ws.id));
                      }
                    }}
                  >
                    <i className="ph ph-caret-down"></i>
                  </span>
                )}
              </button>

              {menuId === ws.id && (
                <div className="workspace-menu">
                  <button type="button" onClick={() => openEdit(ws)}>
                    <i className="ph ph-pencil-simple"></i>
                    تحرير المساحة
                  </button>
                  {!isSystemSpace(ws) && (
                    <button
                      type="button"
                      className="workspace-menu-danger"
                      onClick={() => {
                        setMenuId(null);
                        openEdit(ws);
                        // يفتح التحرير ثم المستخدم يرى زر الأرشفة — أو مباشرة:
                        const ok = window.confirm(
                          `أرشفة مساحة «${ws.label}»؟\n\nستُخفى من الشريط وتُؤرشف مهامها النشطة.`
                        );
                        if (ok) onArchiveSpace?.(ws.id);
                      }}
                    >
                      <i className="ph ph-archive"></i>
                      أرشفة المساحة
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="workspace-tab workspace-add-tab"
          onClick={() => {
            setName('');
            setTrait('');
            setIcon(WORKSPACE_ICONS[2]);
            setColorIndex(2);
            setShowCreate(true);
          }}
          title="مساحة جديدة"
        >
          <i className="ph ph-plus"></i>
          <span>جديد</span>
        </button>
      </div>

      {activeWs?.trait && !isAllMode && (
        <p className="workspace-trait-line" style={{ color: activeWs.color }}>
          <i className={`ph ${activeWs.icon}`}></i>
          {activeWs.trait}
        </p>
      )}

      {isAllMode && (
        <p className="workspace-all-hint">
          عرض شامل لكل المهام النشطة — التقارير للمنصة كاملة. الإضافة تُسجَّل في أول مساحة نشطة.
        </p>
      )}

      {(showCreate || editing) && (
        <div
          className="modal-overlay open workspace-create-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
              setEditId(null);
            }
          }}
        >
          <div className="modal-box card workspace-create-modal">
            <div className="modal-header">
              <h3>{editing ? 'تحرير المساحة' : 'مساحة جديدة'}</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setShowCreate(false);
                  setEditId(null);
                }}
              >
                <i className="ph ph-x" style={{ fontSize: 20 }}></i>
              </button>
            </div>
            <form onSubmit={editing ? submitEdit : submitCreate}>
              <div className="form-field">
                <label>اسم المساحة</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: دراسة، مشروع عميل…"
                  autoFocus
                  required
                />
              </div>
              <div className="form-field">
                <label>السمة / الشعار القصير</label>
                <input
                  type="text"
                  className="form-input"
                  value={trait}
                  onChange={(e) => setTrait(e.target.value)}
                  placeholder="مثال: تركيز عميق · عملاء · عائلة"
                  maxLength={80}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  جملة قصيرة تميّز المساحة تحت الشريط
                </small>
              </div>
              <div className="form-field">
                <label>الأيقونة</label>
                <div className="workspace-icon-picks">
                  {WORKSPACE_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      className={`workspace-icon-pick ${icon === ic ? 'active' : ''}`}
                      onClick={() => setIcon(ic)}
                    >
                      <i className={`ph ${ic}`}></i>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label>اللون</label>
                <div className="workspace-color-picks">
                  {WORKSPACE_COLORS.map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`workspace-color-pick ${colorIndex === i ? 'active' : ''}`}
                      style={{ background: c.color }}
                      onClick={() => setColorIndex(i)}
                    />
                  ))}
                </div>
              </div>
              <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={!name.trim()}>
                  {editing ? 'حفظ' : 'إنشاء المساحة'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreate(false);
                    setEditId(null);
                  }}
                >
                  إلغاء
                </button>
                {editing && !isSystemSpace(editing) && (
                  <button
                    type="button"
                    className="btn-secondary workspace-archive-btn"
                    onClick={handleArchive}
                  >
                    <i className="ph ph-archive"></i>
                    أرشفة المساحة
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
