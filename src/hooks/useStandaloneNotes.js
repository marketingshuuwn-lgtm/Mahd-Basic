import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LEGACY_KEY = 'mahd_standalone_notes_v1';
const MIGRATION_DONE_KEY = 'mahd_standalone_notes_migrated_v1';

/**
 * المفكرة المستقلة — تستخدم نفس جدول task_notes مع task_id = NULL،
 * حتى تتزامن بين الأجهزة (Supabase) بدل ما تكون محفوظة بمتصفح واحد بس (localStorage).
 * أول مرة تشتغل، تنقل أي ملاحظات قديمة كانت محفوظة محلياً تلقائياً.
 */
async function migrateLegacyNotesIfNeeded(showToast) {
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const legacyNotes = raw ? JSON.parse(raw) : [];

    if (Array.isArray(legacyNotes) && legacyNotes.length > 0) {
      const rows = legacyNotes.map((n) => ({
        task_id: null,
        title: n.title || 'مسودة بدون عنوان',
        content_md: n.content_md || '',
        created_at: n.created_at || new Date().toISOString(),
        updated_at: n.updated_at || new Date().toISOString(),
      }));
      const { error } = await supabase.from('task_notes').insert(rows);
      if (error) {
        console.error('legacy notes migration failed:', error);
        return; // لا نعلّم الترحيل كمكتمل حتى ننجح، حتى ما نفقد بيانات المستخدم
      }
      showToast?.(`تم نقل ${rows.length} ملاحظة قديمة إلى المفكرة المتزامنة`, 'ph-cloud-arrow-up');
    }

    localStorage.setItem(MIGRATION_DONE_KEY, '1');
    if (raw) {
      localStorage.setItem(`${LEGACY_KEY}_backup`, raw);
      localStorage.removeItem(LEGACY_KEY);
    }
  } catch (err) {
    console.error('legacy notes migration error:', err);
  }
}

export function useStandaloneNotes(showToast) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('task_notes')
        .select('*')
        .is('task_id', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setNotes(data ?? []);
    } catch (err) {
      console.error(err);
      showToast?.('تعذّر تحميل المفكرة', 'ph-x-circle', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    (async () => {
      await migrateLegacyNotesIfNeeded(showToast);
      await fetchNotes();
    })();

    const channel = supabase
      .channel('standalone-notes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_notes', filter: 'task_id=is.null' },
        () => fetchNotes()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotes, showToast]);

  const createNote = useCallback(
    async (title = 'مسودة بدون عنوان') => {
      const { data, error } = await supabase
        .from('task_notes')
        .insert({ task_id: null, title, content_md: '' })
        .select()
        .single();
      if (error) {
        console.error(error);
        showToast?.('تعذّر إنشاء المسودة', 'ph-x-circle', 'error');
        return null;
      }
      showToast?.('أُنشئت مسودة جديدة', 'ph-file-plus');
      return data;
    },
    [showToast]
  );

  const updateNote = useCallback(
    async (id, patch) => {
      const { error } = await supabase
        .from('task_notes')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) {
        console.error(error);
        showToast?.('تعذّر حفظ المسودة', 'ph-x-circle', 'error');
        return false;
      }
      return true;
    },
    [showToast]
  );

  const deleteNote = useCallback(
    async (id) => {
      const { error } = await supabase.from('task_notes').delete().eq('id', id);
      if (error) {
        showToast?.('تعذّر حذف المسودة', 'ph-x-circle', 'error');
        return;
      }
      showToast?.('تم حذف المسودة', 'ph-trash');
    },
    [showToast]
  );

  return { notes, loading, createNote, updateNote, deleteNote };
}
