import { useEffect, useMemo, useRef, useState } from 'react';
import Sidebar from './components/Sidebar';
import FloatingSmartBar from './components/QuickAdd';
import QuadrantBoard from './components/QuadrantBoard';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import PendingView from './components/PendingView';
import KpiView from './components/KpiView';
import BreakSpace from './components/BreakSpace';
import FloatingTimer from './components/FloatingTimer';
import TimeTrackingSync from './components/TimeTrackingSync';
import SettingsView from './components/SettingsView';
import ArchiveView from './components/ArchiveView';
import NotepadView from './components/NotepadView';
import TaskModal from './components/TaskModal';
import NotesModal from './components/NotesModal';
import ShortcutsHelp from './components/ShortcutsHelp';
import LoadingSkeleton from './components/LoadingSkeleton';
import ViewSwitcher from './components/ViewSwitcher';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import { useTasks } from './hooks/useTasks';
import { sendNotificationPreview, useLocalNotifications } from './hooks/useLocalNotifications';
import { useTrello } from './hooks/useTrello';
import { useToast } from './hooks/useToast';
import { useWorkDaysSetting } from './hooks/useWorkDaysSetting';
import { usePushNotifications } from './hooks/usePushNotifications';
import { useWorkspaces } from './hooks/useWorkspaces';
import { exportTasksAsCsv, exportTasksAsXlsx, readImportFile } from './utils/importExport';
import {
  ALL_WORKSPACES_ID,
  DEFAULT_WORK_DAYS,
  normalizeTaskContext,
  normalizeWorkDays,
} from './utils/taskMeta';
import { isEffectivelyOpen, normalizeTaskStatus } from './utils/taskStatus';

const THEME_KEY = 'mahd_theme_react_v1';
const NOTIFICATION_SETTINGS_KEY = 'mahd_notification_settings_v1';

const NAV_BY_DIGIT = {
  '1': 'Matrix',
  '2': 'Pending',
  '3': 'Kpi',
  '4': 'Motivation',
  '5': 'Notepad',
  '6': 'Archive',
  '7': 'Settings',
};

const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  morningSummary: true,
  morningTime: '10:00',
  eveningReview: true,
  eveningTime: '20:00',
  activeDays: DEFAULT_WORK_DAYS,
};

function normalizeNotificationSettings(value) {
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...(value || {}),
    activeDays: normalizeWorkDays(value?.activeDays || DEFAULT_NOTIFICATION_SETTINGS.activeDays),
  };
}

function readSavedNotificationSettings() {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return normalizeNotificationSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

const TRELLO_SYNC_ENABLED = true;

export default function App() {
  const { showToast } = useToast();
  const [view, setView] = useState('Matrix');
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [notesTarget, setNotesTarget] = useState(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState(readSavedNotificationSettings);
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const trelloAutoSynced = useRef(false);

  const {
    tasks,
    loading,
    connected,
    addTask,
    updateTask,
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
    refetch,
    initialError,
    retry,
  } = useTasks(showToast);

  const { workDays, setWorkDays } = useWorkDaysSetting(showToast);
  const trello = useTrello(showToast, refetch);
  const push = usePushNotifications(showToast);

  const {
    workspaces,
    visibleWorkspaces,
    activeWorkspaceId,
    activeWorkspace,
    isAllMode,
    writeContextId,
    setActiveWorkspaceId,
    addWorkspace,
    updateWorkspace,
    archiveWorkspace,
    restoreWorkspace,
    reorderWorkspaces,
    ensureContextsFromTasks,
  } = useWorkspaces();

  useEffect(() => {
    if (!tasks?.length) return;
    ensureContextsFromTasks(tasks.map((t) => t.context));
  }, [tasks, ensureContextsFromTasks]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (shortcutsOpen) setShortcutsOpen(false);
        else if (notesTarget) setNotesTarget(null);
        else if (modalOpen) setModalOpen(false);
        else if (sidebarOpen) setSidebarOpen(false);
        return;
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }
      if (!e.altKey) return;
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setView('Motivation');
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTaskId(null);
        setModalOpen(true);
        return;
      }
      if (NAV_BY_DIGIT[e.key]) {
        e.preventDefault();
        setView(NAV_BY_DIGIT[e.key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsOpen, notesTarget, modalOpen, sidebarOpen]);

  useEffect(() => {
    if (view === 'Trello') setView('Settings');
  }, [view]);

  const spaceTasks = useMemo(() => {
    if (isAllMode) return tasks;
    return tasks.filter((t) => normalizeTaskContext(t.context) === activeWorkspaceId);
  }, [tasks, activeWorkspaceId, isAllMode]);

  const visibleTasks = useMemo(
    () => spaceTasks.filter((t) => !t.archived),
    [spaceTasks]
  );

  const boardTasks = useMemo(
    () => visibleTasks.filter((t) => normalizeTaskStatus(t) !== 'deferred'),
    [visibleTasks]
  );

  const trelloPageTasks = useMemo(
    () => tasks.filter((t) => !t.archived && t.externalSource === 'trello'),
    [tasks]
  );

  const archivedTasks = useMemo(
    () => spaceTasks.filter((t) => t.archived),
    [spaceTasks]
  );

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(normalizeNotificationSettings(notificationSettings))
    );
  }, [notificationSettings]);

  useLocalNotifications(boardTasks, workDays, notificationSettings);

  useEffect(() => {
    if (!TRELLO_SYNC_ENABLED) return;
    if (!trello.isConnected || trello.loading) return;
    if (trelloAutoSynced.current) return;
    trelloAutoSynced.current = true;
    trello.syncNow({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trello.isConnected, trello.loading]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) || null,
    [tasks, editingTaskId]
  );

  const pendingCount = visibleTasks.filter((t) => {
    const s = normalizeTaskStatus(t);
    if (s === 'cancelled' || s === 'deferred') return false;
    return isEffectivelyOpen(t);
  }).length;
  const trelloCount = trelloPageTasks.filter((t) => !t.completed).length;
  const archiveCount = archivedTasks.length;

  const trelloForUi = {
    ...trello,
    syncNow: TRELLO_SYNC_ENABLED
      ? trello.syncNow
      : async () => {
          showToast('مزامنة تريلو متوقفة مؤقتاً', 'ph-pause');
          return { created: 0, updated: 0 };
        },
  };

  const handleSaveTask = (form, id) => {
    if (id) {
      updateTask(id, form.title, form.quadrant, form.dueDate, form.notes, form.duration, {
        recurrence: form.recurrence || null,
        recurrenceDays: form.recurrenceDays || [],
        context: form.context,
        subtasks: form.subtasks,
        status: form.status,
      });
    } else {
      addTask(form.title, form.quadrant, form.dueDate, form.notes, form.duration, {
        recurrence: form.recurrence || null,
        recurrenceDays: form.recurrenceDays || [],
        context: form.context || writeContextId,
        subtasks: form.subtasks,
        status: form.status,
      });
    }
    setModalOpen(false);
    setEditingTaskId(null);
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setModalOpen(true);
  };

  const openAddModal = (prefill) => {
    setEditingTaskId(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTaskId(null);
  };

  const handleArchiveSpace = async (id) => {
    const okTasks = await archiveTasksInContext(id);
    if (!okTasks) return;
    const okSpace = archiveWorkspace(id);
    if (okSpace) showToast('أُرشفت المساحة ومهامها', 'ph-archive');
  };

  const handleExport = (format) => {
    if (format === 'csv') exportTasksAsCsv(visibleTasks);
    else exportTasksAsXlsx(visibleTasks);
  };

  const handleImportFile = async (file) => {
    try {
      const imported = await readImportFile(file);
      await replaceTasksInContext(writeContextId, imported);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'فشل الاستيراد', 'ph-x-circle', 'error');
    }
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
  };

  const sendTestNotification = () => {
    sendNotificationPreview('تجربة إشعار محلي', 'إذا ظهرت هذه الرسالة فالإشعارات تعمل.');
  };

  if (loading && tasks.length === 0) {
    return <LoadingSkeleton />;
  }

  if (initialError && tasks.length === 0) {
    return (
      <div className="app-error">
        <p>تعذّر الاتصال بقاعدة البيانات</p>
        <button type="button" className="btn-primary" onClick={retry}>
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Sidebar
        view={view}
        onNavigate={setView}
        pendingCount={pendingCount}
        archiveCount={archiveCount}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        connected={connected}
      />

      <main className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="btn-icon sidebar-toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="القائمة"
          >
            <i className="ph ph-list" />
          </button>
          <WorkspaceSwitcher
            workspaces={visibleWorkspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSwitch={setActiveWorkspaceId}
            onCreate={addWorkspace}
            onUpdate={updateWorkspace}
            onArchiveSpace={handleArchiveSpace}
            onReorder={reorderWorkspaces}
            isAllMode={isAllMode}
          />
          <ViewSwitcher view={view} onChange={setView} />
        </header>

        <div className="app-content">
        {view === 'Matrix' && (
          <QuadrantBoard
            tasks={boardTasks}
            onToggleComplete={toggleComplete}
            onSetStatus={setTaskStatus}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={archiveTask}
            onMoveTask={moveTask}
            onReorderInQuadrant={reorderInQuadrant}
            onAddTask={() => openAddModal()}
            onReschedule={rescheduleTask}
            workDays={workDays}
            workspaces={visibleWorkspaces}
          />
        )}

        {view === 'Timeline' && (
          <TimelineView
            tasks={boardTasks}
            onEdit={openEditModal}
            onReschedule={rescheduleTask}
            workDays={workDays}
          />
        )}

        {view === 'Gantt' && (
          <GanttView
            tasks={boardTasks}
            onEdit={openEditModal}
            onReschedule={rescheduleTask}
            workDays={workDays}
          />
        )}

        {view === 'Pending' && (
          <PendingView
            tasks={visibleTasks}
            onToggleComplete={toggleComplete}
            onSetStatus={setTaskStatus}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={archiveTask}
            onAddTask={() => openAddModal()}
            onReschedule={rescheduleTask}
            workDays={workDays}
            workspaces={visibleWorkspaces}
          />
        )}

        {view === 'Kpi' && <KpiView tasks={visibleTasks} workspaces={visibleWorkspaces} />}

        {view === 'Motivation' && <BreakSpace tasks={boardTasks} showToast={showToast} />}

        {view === 'Notepad' && <NotepadView showToast={showToast} />}

        {view === 'Archive' && (
          <ArchiveView
            tasks={archivedTasks}
            onRestore={restoreTask}
            onEdit={openEditModal}
            workDays={workDays}
            workspaces={workspaces}
            workspaceLabel={isAllMode ? 'كل المساحات' : activeWorkspace?.label || activeWorkspaceId}
          />
        )}

        {view === 'Settings' && (
          <SettingsView
            workDays={workDays}
            onChangeWorkDays={(days) => setWorkDays(days)}
            notificationSettings={notificationSettings}
            onChangeNotificationSettings={(next) =>
              setNotificationSettings((prev) => normalizeNotificationSettings({ ...prev, ...next }))
            }
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
            onSendTestNotification={sendTestNotification}
            pushSupported={push.supported}
            pushSubscribed={push.subscribed}
            pushLoading={push.loading}
            onSubscribePush={push.subscribe}
            onUnsubscribePush={push.unsubscribe}
            onSendTestPush={push.sendTestPush}
            trello={trelloForUi}
            trelloTasks={trelloPageTasks}
            onToggleComplete={toggleComplete}
            onSetStatus={setTaskStatus}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={archiveTask}
            onMoveTask={moveTask}
            workDaysForTrello={workDays}
            onExport={handleExport}
            onImportFile={handleImportFile}
          />
        )}
        </div>
      </main>

      <FloatingSmartBar
        onAddTask={addTask}
        onOpenAdvanced={openAddModal}
        activeContext={writeContextId}
      />

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        onClose={closeModal}
        onSave={handleSaveTask}
        workDays={workDays}
        defaultContext={writeContextId}
        workspaces={visibleWorkspaces}
      />

      <FloatingTimer />
      <TimeTrackingSync />
      <NotesModal
        isOpen={Boolean(notesTarget)}
        taskId={notesTarget?.taskId}
        taskTitle={notesTarget?.title}
        onClose={() => setNotesTarget(null)}
        showToast={showToast}
      />
      <ShortcutsHelp isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}
