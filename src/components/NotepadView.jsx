import { useEffect, useMemo, useRef, useState } from 'react';
import { marked } from 'marked';
import { useStandaloneNotes } from '../hooks/useStandaloneNotes';

function slugify(text) {
  return (text || 'مسودة')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

function downloadMd(title, content) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(title)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function NotepadView({ showToast }) {
  const { notes, loading, createNote, updateNote, deleteNote } = useStandaloneNotes(showToast);
  const [activeId, setActiveId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [mode, setMode] = useState('edit');
  const [query, setQuery] = useState('');
  const saveTimer = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.content_md || '').toLowerCase().includes(q)
    );
  }, [notes, query]);

  const activeNote = notes.find((n) => n.id === activeId) || null;

  useEffect(() => {
    if (notes.length > 0 && !activeId) setActiveId(notes[0].id);
    if (notes.length === 0) setActiveId(null);
  }, [notes, activeId]);

  useEffect(() => {
    if (activeNote) {
      setDraftTitle(activeNote.title);
      setDraftContent(activeNote.content_md);
    } else {
      setDraftTitle('');
      setDraftContent('');
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!activeNote) return;
    if (draftTitle === activeNote.title && draftContent === activeNote.content_md) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      updateNote(activeNote.id, {
        title: draftTitle || 'مسودة بدون عنوان',
        content_md: draftContent,
      });
    }, 600);
    return () => clearTimeout(saveTimer.current);
  }, [draftTitle, draftContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    const note = await createNote('مسودة جديدة');
    if (note) setActiveId(note.id);
  };

  const handleDelete = async (id) => {
    await deleteNote(id);
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="notepad-page">
      <div className="page-header">
        <div className="page-title">المفكرة</div>
        <div className="page-desc">ملاحظات حرة مستقلة عن المهام — تُحفظ محلياً على هذا الجهاز</div>
      </div>

      <div className="card notepad-shell">
        <div className="notes-modal-body notepad-body">
          <aside className="notes-sidebar">
            <button type="button" className="btn-primary notes-new-btn" onClick={handleCreate}>
              <i className="ph ph-file-plus"></i> مسودة جديدة
            </button>
            <input
              type="search"
              className="form-input notepad-search"
              placeholder="بحث في المفكرة…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="بحث في المفكرة"
            />
            {loading && <p className="notes-empty-hint">جاري التحميل…</p>}
            {!loading && filtered.length === 0 && (
              <p className="notes-empty-hint">
                {query ? 'لا نتائج لهذا البحث' : 'لا مسودات بعد — أنشئ الأولى'}
              </p>
            )}
            <div className="notes-list">
              {filtered.map((n) => (
                <div
                  key={n.id}
                  className={`notes-list-item ${activeId === n.id ? 'active' : ''}`}
                  onClick={() => setActiveId(n.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setActiveId(n.id);
                  }}
                >
                  <div className="notes-list-item-title">{n.title || 'بدون عنوان'}</div>
                  <button
                    type="button"
                    className="btn-icon danger notes-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(n.id);
                    }}
                    title="حذف"
                  >
                    <i className="ph ph-trash" style={{ fontSize: 14 }}></i>
                  </button>
                </div>
              ))}
            </div>
          </aside>

          <div className="notes-editor">
            {!activeNote ? (
              <div className="notes-empty-state">
                <i className="ph ph-notebook" style={{ fontSize: 40 }}></i>
                <p>اختر مسودة أو أنشئ واحدة جديدة</p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  className="form-input notes-title-input"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="عنوان المسودة"
                />
                <div className="notes-toolbar">
                  <div className="notes-mode-toggle">
                    <button
                      type="button"
                      className={`chip-btn ${mode === 'edit' ? 'active' : ''}`}
                      onClick={() => setMode('edit')}
                    >
                      <i className="ph ph-pencil-simple"></i> تحرير
                    </button>
                    <button
                      type="button"
                      className={`chip-btn ${mode === 'preview' ? 'active' : ''}`}
                      onClick={() => setMode('preview')}
                    >
                      <i className="ph ph-eye"></i> معاينة
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => downloadMd(draftTitle, draftContent)}
                  >
                    <i className="ph ph-download-simple"></i> تنزيل .md
                  </button>
                </div>
                {mode === 'edit' ? (
                  <textarea
                    className="form-input notes-textarea"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    placeholder="اكتب هنا… يدعم Markdown (# عناوين، **عريض**، - نقاط، [رابط](url)…)"
                  />
                ) : (
                  <div
                    className="notes-preview"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(draftContent || '*لا يوجد محتوى بعد*'),
                    }}
                  />
                )}
                <p className="notes-autosave-hint">يُحفظ تلقائياً على هذا الجهاز</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
