import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const TABLE = 'tasks';

function fromRow(row) {
  return {
    id: row.id,
    title: row.title,
    quadrant: row.quadrant,
    completed: row.completed,
    notes: row.notes ?? '',
    dueDate: row.due_date ?? '',
    duration: row.duration ?? 1,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function useTasks(showToast) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);

  const fetchTasks = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      setConnected(false);
      showToast?.('تعذّر الاتصال بقاعدة البيانات', 'ph-x-circle', 'error');
    } else {
      setConnected(true);
      setTasks((data ?? []).map(fromRow));
    }

    if (isInitial) setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchTasks(true);

    // Realtime ذكي: يحدّث الـ state محلياً حسب نوع الحدث بدل إعادة جلب كل شيء
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) => {
        const newTask = fromRow(payload.new);
        setTasks((prev) => {
          // تجنب التكرار إذا كانت المهمة أُضيفت محلياً (optimistic)
          if (prev.some((t) => t.id === newTask.id)) return prev;
          // إزالة أي مهمة مؤقتة بنفس العنوان تقريباً
          const withoutTemp = prev.filter((t) => !String(t.id).startsWith('temp-'));
          return [newTask, ...withoutTemp];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE }, (payload) => {
        const updated = fromRow(payload.new);
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: TABLE }, (payload) => {
        const deletedId = payload.old.id;
        setTasks((prev) => prev.filter((t) => t.id !== deletedId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  // ─── إضافة مهمة (Optimistic) ───────────────────────────────
  const addTask = useCallback(
    async (title, quadrant, dueDate, notes, duration = 1) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticTask = {
        id: tempId,
        title,
        quadrant,
        completed: false,
        notes: notes || '',
        dueDate: dueDate || '',
        duration: duration || 1,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      setTasks((prev) => [optimisticTask, ...prev]);

      const { data, error } = await supabase
        .from(TABLE)
        .insert({
          title,
          quadrant,
          due_date: dueDate || null,
          notes: notes || '',
          duration: duration || 1,
        })
        .select()
        .single();

      if (error) {
        console.error(error);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        showToast?.('تعذّرت إضافة المهمة', 'ph-x-circle', 'error');
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === tempId ? fromRow(data) : t))
      );
      showToast?.(`أُضيفت "${title}"`, 'ph-plus-circle');
    },
    [showToast]
  );

  // ─── تعديل مهمة (Optimistic) ───────────────────────────────
  const updateTask = useCallback(
    async (id, title, quadrant, dueDate, notes, duration) => {
      const previous = tasks.find((t) => t.id === id);
      if (!previous) return;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, title, quadrant, dueDate: dueDate || '', notes: notes || '', duration: duration || 1 }
            : t
        )
      );

      const { error } = await supabase
        .from(TABLE)
        .update({
          title,
          quadrant,
          due_date: dueDate || null,
          notes: notes || '',
          duration: duration || 1,
        })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) => prev.map((t) => (t.id === id ? previous : t)));
        showToast?.('تعذّر تعديل المهمة', 'ph-x-circle', 'error');
        return;
      }

      showToast?.(`تم تعديل "${title}"`, 'ph-pencil-simple');
    },
    [tasks, showToast]
  );

  // ─── حذف مهمة (Optimistic) ─────────────────────────────────
  const deleteTask = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      setTasks((prev) => prev.filter((t) => t.id !== id));

      const { error } = await supabase.from(TABLE).delete().eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) => [task, ...prev]);
        showToast?.('تعذّر حذف المهمة', 'ph-x-circle', 'error');
        return;
      }

      showToast?.(`تم حذف "${task.title}"`, 'ph-trash');
    },
    [tasks, showToast]
  );

  // ─── تبديل الإكمال (Optimistic) ────────────────────────────
  const toggleComplete = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const completed = !task.completed;
      const completedAt = completed ? new Date().toISOString() : null;

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed, completedAt } : t))
      );

      const { error } = await supabase
        .from(TABLE)
        .update({ completed, completed_at: completedAt })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, completed: task.completed, completedAt: task.completedAt } : t
          )
        );
        showToast?.('تعذّر تحديث حالة المهمة', 'ph-x-circle', 'error');
        return;
      }

      if (completed) showToast?.(`✓ "${task.title}" مكتملة`, 'ph-check-circle');
    },
    [tasks, showToast]
  );

  // ─── نقل مهمة (Optimistic) ─────────────────────────────────
  const moveTask = useCallback(
    async (id, newQuadrant) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || task.quadrant === newQuadrant) return;

      const previousQuadrant = task.quadrant;

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, quadrant: newQuadrant } : t))
      );

      const { error } = await supabase
        .from(TABLE)
        .update({ quadrant: newQuadrant })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, quadrant: previousQuadrant } : t))
        );
        showToast?.('تعذّر نقل المهمة', 'ph-x-circle', 'error');
        return;
      }

      showToast?.('نُقلت المهمة', 'ph-arrows-out-card-horizontal');
    },
    [tasks, showToast]
  );

  // ─── إعادة جدولة (Optimistic) ──────────────────────────────
  const rescheduleTask = useCallback(
    async (id, newDate) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const previousDate = task.dueDate;

      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, dueDate: newDate } : t))
      );

      const { error } = await supabase
        .from(TABLE)
        .update({ due_date: newDate })
        .eq('id', id);

      if (error) {
        console.error(error);
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, dueDate: previousDate } : t))
        );
        showToast?.('تعذّر تحديث الموعد', 'ph-x-circle', 'error');
        return;
      }

      showToast?.('تم تحديث موعد المهمة', 'ph-calendar-check');
    },
    [tasks, showToast]
  );

  // ─── استبدال كل المهام (استيراد) ───────────────────────────
  const replaceAllTasks = useCallback(
    async (importedTasks) => {
      const { error: deleteError } = await supabase.from(TABLE).delete().neq('id', 0);
      if (deleteError) {
        console.error(deleteError);
        showToast?.('حدث خطأ أثناء استبدال المهام', 'ph-x-circle', 'error');
        return;
      }

      const rows = importedTasks.map((t) => ({
        title: t.title,
        quadrant: t.quadrant,
        completed: t.completed,
        notes: t.notes || '',
        due_date: t.dueDate || null,
        duration: t.duration || 1,
        completed_at: t.completed ? new Date().toISOString() : null,
      }));

      const { data, error: insertError } = await supabase.from(TABLE).insert(rows).select();
      if (insertError) {
        console.error(insertError);
        showToast?.('حدث خطأ أثناء استيراد المهام', 'ph-x-circle', 'error');
        return;
      }

      setTasks((data ?? []).map(fromRow));
      showToast?.(`تم استيراد ${rows.length} مهمة بنجاح`, 'ph-upload-simple');
    },
    [showToast]
  );

  return {
    tasks,
    loading,
    connected,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    moveTask,
    rescheduleTask,
    replaceAllTasks,
    refetch: () => fetchTasks(true),
  };
}
