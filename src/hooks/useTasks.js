import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  mapTrelloCardToTaskFields,
  trelloCreateCard,
  trelloFetchBoardCards,
  trelloSetCardClosed,
  trelloUpdateCard,
} from '../lib/trello';
import { normalizeSubtasks } from '../utils/subtasks';
import { normalizeTaskContext } from '../utils/taskMeta';
import { normalizeTaskStatus } from '../utils/taskStatus';

const UI_STATE_KEY = 'mahd_trello_task_ui_v1';
const DEFAULT_QUADRANT = 'important-not-urgent';
const TRELLO_CONTEXT = 'trello';

function readUiState(boardId) {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed?.[boardId] && typeof parsed[boardId] === 'object' ? parsed[boardId] : {};
  } catch {
    return {};
  }
}

function writeUiState(boardId, updater) {
  try {
    const raw = localStorage.getItem(UI_STATE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const current = all?.[boardId] && typeof all[boardId] === 'object' ? all[boardId] : {};
    const next = typeof updater === 'function' ? updater(current) : updater;
    localStorage.setItem(UI_STATE_KEY, JSON.stringify({ ...(all || {}), [boardId]: next }));
    return next;
  } catch {
    return null;
  }
}

function toTask(card, boardId) {
  const base = mapTrelloCardToTaskFields(card);
  const ui = readUiState(boardId)[card.id] || {};
  const status = card.closed
    ? 'completed'
    : normalizeTaskStatus(ui.status || 'not_started');
  const archived = Boolean(ui.archived);
  return {
    ...base,
    quadrant: ui.quadrant || DEFAULT_QUADRANT,
    context: TRELLO_CONTEXT,
    subtasks: normalizeSubtasks(base.subtasks),
    status,
    completed: card.closed || status === 'completed',
    archived,
    archivedAt: ui.archivedAt || null,
    duration: ui.duration || 1,
    sortOrder: ui.sortOrder ?? base.externalMeta?.cardPosition ?? 0,
    recurrence: ui.recurrence || null,
    recurrenceDays: ui.recurrenceDays || [],
  };
}

function updateLocalTask(boardId, taskId, patch) {
  writeUiState(boardId, (current) => ({
    ...current,
    [taskId]: { ...(current[taskId] || {}), ...patch },
  }));
}

function clearLocalTask(boardId, taskId) {
  writeUiState(boardId, (current) => {
    const next = { ...current };
    delete next[taskId];
    return next;
  });
}

/**
 * مزود المهام في نسخة Trello-first.
 * Trello يملك بطاقة المهمة، بينما تحفظ اختيارات واجهة مهد غير القابلة للتمثيل
 * (مثل ربع أيزنهاور) محليًا في هذا المتصفح إلى أن يصل Supabase الجديد.
 */
export function useTasks(showToast, trello) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [initialError, setInitialError] = useState(false);

  const boardId = trello?.config?.boardId || null;
  const apiKey = trello?.config?.apiKey || null;
  const accessToken = trello?.config?.accessToken || null;

  const fetchTasks = useCallback(
    async (isInitial = false) => {
      if (isInitial) {
        setLoading(true);
        setInitialError(false);
      }

      if (!boardId || !apiKey || !accessToken) {
        setTasks([]);
        setConnected(true);
        if (isInitial) setLoading(false);
        return [];
      }

      try {
        const cards = await trelloFetchBoardCards(apiKey, accessToken, boardId);
        const next = (cards || [])
          .map((card) => toTask(card, boardId))
          .sort((a, b) => a.sortOrder - b.sortOrder || String(a.title).localeCompare(String(b.title), 'ar'));
        setTasks(next);
        setConnected(true);
        return next;
      } catch (err) {
        console.error(err);
        setConnected(false);
        if (isInitial) setInitialError(true);
        showToast?.(err.message || 'تعذّر تحميل مهام تريلو', 'ph-x-circle', 'error');
        return [];
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [accessToken, apiKey, boardId, showToast]
  );

  useEffect(() => {
    fetchTasks(true);
  }, [fetchTasks, trello?.revision]);

  const ensureBoard = useCallback(() => {
    if (!boardId || !apiKey || !accessToken) {
      showToast?.('اربط تريلو واختر Board أولاً من الإعدادات', 'ph-warning', 'error');
      return false;
    }
    return true;
  }, [accessToken, apiKey, boardId, showToast]);

  const addTask = useCallback(
    async (title, quadrant, dueDate, notes, duration = 1, extra = {}) => {
      if (!ensureBoard()) return;
      const listId = trello?.config?.defaultListId || trello?.lists?.[0]?.id;
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        id: tempId,
        title,
        quadrant: quadrant || DEFAULT_QUADRANT,
        context: TRELLO_CONTEXT,
        subtasks: normalizeSubtasks(extra.subtasks),
        status: normalizeTaskStatus(extra.status || 'not_started'),
        completed: false,
        archived: false,
        archivedAt: null,
        notes: notes || '',
        dueDate: dueDate || '',
        duration: duration || 1,
        sortOrder: -Date.now(),
        recurrence: extra.recurrence || null,
        recurrenceDays: extra.recurrenceDays || [],
        externalSource: 'trello',
        externalId: null,
        externalUrl: null,
        externalMeta: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };
      setTasks((previous) => [optimistic, ...previous]);

      try {
        const card = await trelloCreateCard(apiKey, accessToken, {
          listId,
          title,
          description: notes || '',
          dueDate,
        });
        updateLocalTask(boardId, card.id, {
          quadrant: optimistic.quadrant,
          status: optimistic.status,
          duration: optimistic.duration,
          recurrence: optimistic.recurrence,
          recurrenceDays: optimistic.recurrenceDays,
        });
        await fetchTasks(false);
        showToast?.(`أُضيفت "${title}" إلى Trello`, 'ph-plus-circle');
      } catch (err) {
        console.error(err);
        setTasks((previous) => previous.filter((task) => task.id !== tempId));
        showToast?.(err.message || 'تعذّرت إضافة البطاقة في Trello', 'ph-x-circle', 'error');
      }
    },
    [accessToken, apiKey, boardId, ensureBoard, fetchTasks, showToast, trello?.config?.defaultListId, trello?.lists]
  );

  const updateTask = useCallback(
    async (id, title, quadrant, dueDate, notes, duration, extra = {}) => {
      const previous = tasks.find((task) => task.id === id);
      if (!previous || !ensureBoard()) return;
      const nextStatus = normalizeTaskStatus(extra.status ?? previous.status);
      const localPatch = {
        quadrant: quadrant || previous.quadrant,
        status: nextStatus,
        duration: duration || 1,
        recurrence: extra.recurrence ?? previous.recurrence,
        recurrenceDays: extra.recurrenceDays ?? previous.recurrenceDays,
        archived: nextStatus === 'cancelled' ? true : previous.archived,
        archivedAt: nextStatus === 'cancelled' ? new Date().toISOString() : previous.archivedAt,
      };
      setTasks((current) =>
        current.map((task) =>
          task.id === id
            ? {
                ...task,
                ...localPatch,
                title,
                notes: notes || '',
                dueDate: dueDate || '',
                completed: nextStatus === 'completed',
                subtasks: extra.subtasks ? normalizeSubtasks(extra.subtasks) : task.subtasks,
              }
            : task
        )
      );
      try {
        if (nextStatus === 'completed' || nextStatus === 'cancelled') {
          await trelloSetCardClosed(apiKey, accessToken, id, true);
        } else {
          await trelloUpdateCard(apiKey, accessToken, id, {
            title,
            description: notes || '',
            dueDate: dueDate || null,
          });
        }
        updateLocalTask(boardId, id, localPatch);
        await fetchTasks(false);
        showToast?.(`تم تعديل "${title}"`, 'ph-pencil-simple');
      } catch (err) {
        console.error(err);
        setTasks((current) => current.map((task) => (task.id === id ? previous : task)));
        showToast?.(err.message || 'تعذّر تعديل بطاقة Trello', 'ph-x-circle', 'error');
      }
    },
    [accessToken, apiKey, boardId, ensureBoard, fetchTasks, showToast, tasks]
  );

  const archiveTask = useCallback(
    async (id) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || !ensureBoard()) return;
      const patch = { archived: true, archivedAt: new Date().toISOString(), status: 'completed' };
      setTasks((current) => current.map((item) => (item.id === id ? { ...item, ...patch, completed: true } : item)));
      try {
        await trelloSetCardClosed(apiKey, accessToken, id, true);
        updateLocalTask(boardId, id, patch);
        showToast?.(`أُغلقت وأُرشفت "${task.title}" في Trello`, 'ph-archive');
      } catch (err) {
        console.error(err);
        setTasks((current) => current.map((item) => (item.id === id ? task : item)));
        showToast?.(err.message || 'تعذّرت أرشفة بطاقة Trello', 'ph-x-circle', 'error');
      }
    },
    [accessToken, apiKey, boardId, ensureBoard, showToast, tasks]
  );

  const archiveTasksInContext = useCallback(
    async (context) => {
      const target = tasks.filter(
        (task) => normalizeTaskContext(task.context) === normalizeTaskContext(context) && !task.archived
      );
      await Promise.all(target.map((task) => archiveTask(task.id)));
      return true;
    },
    [archiveTask, tasks]
  );

  const restoreTask = useCallback(
    async (id) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || !ensureBoard()) return;
      const patch = { archived: false, archivedAt: null, status: 'not_started' };
      setTasks((current) => current.map((item) => (item.id === id ? { ...item, ...patch, completed: false } : item)));
      try {
        await trelloSetCardClosed(apiKey, accessToken, id, false);
        updateLocalTask(boardId, id, patch);
        await fetchTasks(false);
        showToast?.(`استُرجعت "${task.title}" في Trello`, 'ph-arrow-counter-clockwise');
      } catch (err) {
        console.error(err);
        setTasks((current) => current.map((item) => (item.id === id ? task : item)));
        showToast?.(err.message || 'تعذّر استرجاع بطاقة Trello', 'ph-x-circle', 'error');
      }
    },
    [accessToken, apiKey, boardId, ensureBoard, fetchTasks, showToast, tasks]
  );

  const toggleComplete = useCallback(
    async (id) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || !ensureBoard()) return;
      const completed = !task.completed;
      setTasks((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, completed, status: completed ? 'completed' : 'not_started', completedAt: completed ? new Date().toISOString() : null }
            : item
        )
      );
      try {
        await trelloSetCardClosed(apiKey, accessToken, id, completed);
        updateLocalTask(boardId, id, { status: completed ? 'completed' : 'not_started' });
        await fetchTasks(false);
        if (completed) showToast?.(`✓ "${task.title}" مكتملة في Trello`, 'ph-check-circle');
      } catch (err) {
        console.error(err);
        setTasks((current) => current.map((item) => (item.id === id ? task : item)));
        showToast?.(err.message || 'تعذّر تحديث بطاقة Trello', 'ph-x-circle', 'error');
      }
    },
    [accessToken, apiKey, boardId, ensureBoard, fetchTasks, showToast, tasks]
  );

  const setTaskStatus = useCallback(
    async (id, rawStatus) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      const status = normalizeTaskStatus(rawStatus);
      if (status === 'completed' || status === 'cancelled') {
        if (!task.completed) await toggleComplete(id);
        if (status === 'cancelled') updateLocalTask(boardId, id, { archived: true, archivedAt: new Date().toISOString() });
        return;
      }
      updateLocalTask(boardId, id, { status });
      setTasks((current) => current.map((item) => (item.id === id ? { ...item, status, completed: false } : item)));
      showToast?.('حالة مَهَد حُفظت محليًا لهذه البطاقة', 'ph-bookmark-simple');
    },
    [boardId, showToast, tasks, toggleComplete]
  );

  const toggleSubtask = useCallback(
    (taskId, subtaskId) => {
      showToast?.('تعديل عناصر Checklist من مَهَد سيضاف بعد تثبيت مسار Trello-first. عدّلها من Trello حاليًا.', 'ph-info');
    },
    [showToast]
  );

  const moveTask = useCallback(
    (id, quadrant) => {
      const task = tasks.find((item) => item.id === id);
      if (!task) return;
      updateLocalTask(boardId, id, { quadrant });
      setTasks((current) => current.map((item) => (item.id === id ? { ...item, quadrant } : item)));
      showToast?.('موضع مصفوفة مَهَد حُفظ محليًا لهذه البطاقة', 'ph-arrows-out-card-horizontal');
    },
    [boardId, showToast, tasks]
  );

  const rescheduleTask = useCallback(
    async (id, newDate) => {
      const task = tasks.find((item) => item.id === id);
      if (!task || !ensureBoard()) return;
      setTasks((current) => current.map((item) => (item.id === id ? { ...item, dueDate: newDate } : item)));
      try {
        await trelloUpdateCard(apiKey, accessToken, id, { dueDate: newDate || null });
        await fetchTasks(false);
        showToast?.('تم تحديث موعد البطاقة في Trello', 'ph-calendar-check');
      } catch (err) {
        console.error(err);
        setTasks((current) => current.map((item) => (item.id === id ? task : item)));
        showToast?.(err.message || 'تعذّر تحديث موعد Trello', 'ph-x-circle', 'error');
      }
    },
    [accessToken, apiKey, ensureBoard, fetchTasks, showToast, tasks]
  );

  const reorderInQuadrant = useCallback(
    (quadrant, orderedIds) => {
      const positions = new Map(orderedIds.map((id, index) => [String(id), index]));
      orderedIds.forEach((id, index) => updateLocalTask(boardId, id, { sortOrder: index }));
      setTasks((current) =>
        current.map((task) =>
          task.quadrant === quadrant && positions.has(String(task.id))
            ? { ...task, sortOrder: positions.get(String(task.id)) }
            : task
        )
      );
    },
    [boardId]
  );

  const replaceTasksInContext = useCallback(
    async (context, importedTasks) => {
      if (!ensureBoard()) return;
      const active = tasks.filter(
        (task) => normalizeTaskContext(task.context) === normalizeTaskContext(context) && !task.archived
      );
      await Promise.all(active.map((task) => archiveTask(task.id)));
      for (const imported of importedTasks) {
        // تسلسل متعمد لتجنب تجاوز حد Trello عند استيراد ملف كبير.
        // eslint-disable-next-line no-await-in-loop
        await addTask(imported.title, imported.quadrant, imported.dueDate, imported.notes, imported.duration, imported);
      }
      showToast?.(`تم إنشاء ${importedTasks.length} بطاقة مستوردة في Trello`, 'ph-upload-simple');
    },
    [addTask, archiveTask, ensureBoard, showToast, tasks]
  );

  const selectedTasks = useMemo(() => tasks, [tasks]);

  return {
    tasks: selectedTasks,
    loading,
    connected,
    addTask,
    updateTask,
    deleteTask: archiveTask,
    archiveTask,
    archiveTasksInContext,
    restoreTask,
    toggleComplete,
    setTaskStatus,
    toggleSubtask,
    moveTask,
    rescheduleTask,
    reorderInQuadrant,
    replaceTasksInContext,
    refetch: () => fetchTasks(false),
    initialError,
    retry: () => fetchTasks(true),
  };
}
