import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const TABLE = 'tasks';

// يحوّل صف قادم من Supabase (snake_case) إلى شكل المهمة المستخدم في الواجهة (camelCase)
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

  const fetchTasks = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchTasks();

    // اشتراك في التحديثات اللحظية حتى تنعكس التغييرات فوراً على كل الأجهزة المتصلة
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTasks]);

  const addTask = useCallback(
    async (title, quadrant, dueDate, notes, duration = 1) => {
      const { error } = await supabase.from(TABLE).insert({
        title,
        quadrant,
        due_date: dueDate || null,
        notes,
        duration,
      });
      if (error) {
        console.error(error);
        showToast?.('تعذّرت إضافة المهمة', 'ph-x-circle', 'error');
        return;
      }
      showToast?.(`أُضيفت "${title}"`, 'ph-plus-circle');
    },
    [showToast]
  );

  const updateTask = useCallback(
    async (id, title, quadrant, dueDate, notes, duration) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ title, quadrant, due_date: dueDate || null, notes, duration: duration || 1 })
        .eq('id', id);
      if (error) {
        console.error(error);
        showToast?.('تعذّر تعديل المهمة', 'ph-x-circle', 'error');
        return;
      }
      showToast?.(`تم تعديل "${title}"`, 'ph-pencil-simple');
    },
    [showToast]
  );

  const deleteTask = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) {
        console.error(error);
        showToast?.('تعذّر حذف المهمة', 'ph-x-circle', 'error');
        return;
      }
      showToast?.(`تم حذف "${task?.title ?? ''}"`, 'ph-trash');
    },
    [tasks, showToast]
  );

  const toggleComplete = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;
      const completed = !task.completed;
      const { error } = await supabase
        .from(TABLE)
        .update({ completed, completed_at: completed ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) {
        console.error(error);
        showToast?.('تعذّر تحديث حالة المهمة', 'ph-x-circle', 'error');
        return;
      }
      if (completed) showToast?.(`✓ "${task.title}" مكتملة`, 'ph-check-circle');
    },
    [tasks, showToast]
  );

  const moveTask = useCallback(
    async (id, newQuadrant) => {
      const task = tasks.find((t) => t.id === id);
      if (!task || task.quadrant === newQuadrant) return;
      const { error } = await supabase.from(TABLE).update({ quadrant: newQuadrant }).eq('id', id);
      if (error) {
        console.error(error);
        showToast?.('تعذّر نقل المهمة', 'ph-x-circle', 'error');
        return;
      }
      showToast?.('نُقلت المهمة', 'ph-arrows-out-card-horizontal');
    },
    [tasks, showToast]
  );

  const rescheduleTask = useCallback(
    async (id, newDate) => {
      const { error } = await supabase.from(TABLE).update({ due_date: newDate }).eq('id', id);
      if (error) {
        console.error(error);
        showToast?.('تعذّر تحديث الموعد', 'ph-x-circle', 'error');
        return;
      }
      showToast?.(`تم تحديث موعد المهمة`, 'ph-calendar-check');
    },
    [showToast]
  );

  // استيراد جماعي: يحذف كل شيء ويستبدله بالمهام المستوردة (نفس سلوك النسخة الأصلية)
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
      const { error: insertError } = await supabase.from(TABLE).insert(rows);
      if (insertError) {
        console.error(insertError);
        showToast?.('حدث خطأ أثناء استيراد المهام', 'ph-x-circle', 'error');
        return;
      }
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
    refetch: fetchTasks,
  };
}
