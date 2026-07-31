import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mahd_standalone_notes_v1';

function readNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function uid() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useStandaloneNotes(showToast) {
  const [notes, setNotes] = useState(readNotes);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNotes(readNotes());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) writeNotes(notes);
  }, [notes, loading]);

  const createNote = useCallback(
    (title = 'مسودة جديدة') => {
      const note = {
        id: uid(),
        title,
        content_md: '',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      setNotes((prev) => [note, ...prev]);
      showToast?.('أُنشئت مسودة جديدة', 'ph-file-plus');
      return note;
    },
    [showToast]
  );

  const updateNote = useCallback((id, patch) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              ...patch,
              updated_at: new Date().toISOString(),
            }
          : n
      )
    );
    return true;
  }, []);

  const deleteNote = useCallback(
    (id) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      showToast?.('تم حذف المسودة', 'ph-trash');
    },
    [showToast]
  );

  return { notes, loading, createNote, updateNote, deleteNote };
}
