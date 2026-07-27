import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import FloatingSmartBar from './components/QuickAdd';
import QuadrantBoard from './components/QuadrantBoard';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import PendingView from './components/PendingView';
import KpiView from './components/KpiView';
import TrelloView from './components/TrelloView';
import SettingsView from './components/SettingsView';
import TaskModal from './components/TaskModal';
import ViewSwitcher from './components/ViewSwitcher';
import { useTasks } from './hooks/useTasks';
import { sendNotificationPreview, useLocalNotifications } from './hooks/useLocalNotifications';
import { useTrello } from './hooks/useTrello';
import { useToast } from './hooks/useToast';
import { exportTasksAsCsv, exportTasksAsXlsx, readImportFile } from './utils/importExport';
import { DEFAULT_WORK_DAYS, normalizeWorkDays } from './utils/taskMeta';

const THEME_KEY = 'mahd_theme_react_v1';
const SIDEBAR_KEY = 'mahd_sidebar_compact';
const WORK_DAYS_KEY = 'mahd_work_days_v1';
const NOTIFICATION_SETTINGS_KEY = 'mahd_notification_settings_v1';

const DEFAULT_NOTIFICATION_SETTINGS = {
  enabled: false,
  morningSummary: true,
  morningTime: '10:00',
  eveningReview: true,
  eveningTime: '20:00',
  activeDays: DEFAULT_WORK_DAYS,
};

function readSavedWorkDays() {
  try {
    const raw = localStorage.getItem(WORK_DAYS_KEY);
    if (!raw) return DEFAULT_WORK_DAYS;
    return normalizeWorkDays(JSON.parse(raw));
  } catch {
    return DEFAULT_WORK_DAYS;
  }
}

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

function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

/** إيقاف مؤقت لمزامنة تريلو التلقائية — الكود والواجهة يبقيان */
const TRELLO_SYNC_ENABLED = false;

export default function App() {
  const showToast = useToast();
  const {
    tasks,
    loading,
    connected,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    toggleSubtask,
    moveTask,
    rescheduleTask,
    reorderInQuadrant,
    replaceAllTasks,
    refetch,
  } = useTasks(showToast);

  const trello = useTrello(showToast, () => refetch());

  const [view, setView] = useState('Matrix');
  const [subview, setSubview] = useState('Board');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === '1'
  );
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [workDays, setWorkDays] = useState(readSavedWorkDays);
  const [notificationSettings, setNotificationSettings] = useState(readSavedNotificationSettings);
  const [notificationPermission, setNotificationPermission] = useState(getNotificationPermission);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, sidebarCompact ? '1' : '0');
  }, [sidebarCompact]);

  useEffect(() => {
    localStorage.setItem(WORK_DAYS_KEY, JSON.stringify(normalizeWorkDays(workDays)));
  }, [workDays]);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(normalizeNotificationSettings(notificationSettings))
    );
  }, [notificationSettings]);

  useLocalNotifications(tasks, workDays, notificationSettings);

  // مزامنة تريلو متوقفة مؤقتاً
  useEffect(() => {
    if (!TRELLO_SYNC_ENABLED) return;
    if (trello.isConnected && !trello.loading) {
      trello.syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trello.isConnected, trello.loading]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) || null,
    [tasks, editingTaskId]
  );

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const trelloCount = tasks.filter((t) => t.externalSource === 'trello' && !t.completed).length;

  const openAddModal = () => {
    setEditingTaskId(null);
    setModalOpen(true);
  };
  const openEditModal = (id) => {
    setEditingTaskId(id);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleSaveTask = (form, id) => {
    const extra = {
      recurrence: form.recurrence || null,
      recurrenceDays: form.recurrenceDays || [],
      context: form.context || 'work',
      subtasks: form.subtasks || [],
    };
    if (id) {
      updateTask(id, form.title, form.quadrant, form.dueDate, form.notes, form.duration, extra);
    } else {
      addTask(form.title, form.quadrant, form.dueDate, form.notes, form.duration, extra);
    }
    closeModal();
  };

  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      showToast('المتصفح لا يدعم إشعارات سطح المكتب', 'ph-warning', 'error');
      return 'unsupported';
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      showToast('تم تفعيل إذن التنبيهات', 'ph-bell-ringing');
      setNotificationSettings((prev) => ({ ...prev, enabled: true }));
    } else {
      showToast('لم يتم منح إذن التنبيهات', 'ph-warning', 'error');
    }
    return permission;
  };

  const sendTestNotification = () => {
    const ok = sendNotificationPreview();
    if (!ok) showToast('فعّل إذن التنبيهات أولاً', 'ph-warning', 'error');
  };

  const handleExport = (format) => {
    if (format === 'csv') exportTasksAsCsv(tasks);
    else exportTasksAsXlsx(tasks);
  };

  const handleImportFile = async (file) => {
    try {
      const imported = await readImportFile(file);
      if (imported.length === 0) {
        showToast('الملف فارغ أو غير صالح', 'ph-warning', 'error');
        return;
      }
      const confirmed = window.confirm(
        `سيتم حذف جميع المهام الحالية (${tasks.length}) واستبدالها بـ ${imported.length} مهمة.\n\nهل أنت متأكد؟`
      );
      if (!confirmed) return;
      await replaceAllTasks(imported);
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء قراءة الملف', 'ph-x-circle', 'error');
    }
  };

  if (loading) {
    return (
      <div className="full-center">
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>جاري تحميل المهام…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} .loading-spinner{width:48px;height:48px;border:4px solid var(--border-color);border-top-color:var(--accent);border-radius:50%;animation:spin .75s linear infinite;margin:0 auto 16px}`}</style>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="full-center" style={{ padding: 24 }}>
        <div className="card" style={{ maxWidth: 440, textAlign: 'center', padding: 36 }}>
          <h2 style={{ marginBottom: 12 }}>غير متصل بقاعدة البيانات</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
            تأكد من ملف .env ثم أعد تشغيل npm run dev
          </p>
          <button type="button" className="btn-primary" onClick={() => refetch()} style={{ margin: '0 auto' }}>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-container ${sidebarCompact ? 'sidebar-is-compact' : ''}`}>
      <div className="mobile-header">
        <div className="logo-area" style={{ marginBottom: 0 }}>
          <div className="logo-icon" style={{ width: 36, height: 36, fontSize: 18 }}>
            <i className="ph ph-tree-evergreen"></i>
          </div>
          <div className="logo-text" style={{ fontSize: 20 }}>
            مهد
          </div>
        </div>
        <button type="button" className="btn-icon" onClick={() => setSidebarOpen(true)}>
          <i className="ph ph-list" style={{ fontSize: 24 }}></i>
        </button>
      </div>

      <Sidebar
        view={view}
        onSwitchView={setView}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        pendingCount={pendingCount}
        trelloCount={trelloCount}
        totalCount={tasks.length}
        connected={connected}
        onExport={handleExport}
        onImportFile={handleImportFile}
        compact={sidebarCompact}
        onToggleCompact={() => setSidebarCompact((v) => !v)}
      />

      <main className="main-content">
        {view === 'Matrix' && (
          <div id="viewMatrix">
            <div className="matrix-topbar">
              <ViewSwitcher subview={subview} onSwitch={setSubview} />
            </div>

            {subview === 'Board' && (
              <QuadrantBoard
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onToggleSubtask={toggleSubtask}
                onEdit={openEditModal}
                onDelete={deleteTask}
                onMoveTask={moveTask}
                onReorderInQuadrant={reorderInQuadrant}
                workDays={workDays}
              />
            )}
            {subview === 'Timeline' && (
              <TimelineView
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onToggleSubtask={toggleSubtask}
                onEdit={openEditModal}
                onDelete={deleteTask}
                onReschedule={rescheduleTask}
                workDays={workDays}
              />
            )}
            {subview === 'Gantt' && (
              <GanttView
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onEdit={openEditModal}
                onReschedule={rescheduleTask}
                workDays={workDays}
              />
            )}
          </div>
        )}

        {view === 'Pending' && (
          <PendingView
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={deleteTask}
            workDays={workDays}
          />
        )}

        {view === 'Trello' && (
          <TrelloView
            tasks={tasks}
            trello={{
              ...trello,
              syncNow: TRELLO_SYNC_ENABLED
                ? trello.syncNow
                : async () => {
                    showToast('مزامنة تريلو متوقفة مؤقتاً', 'ph-pause');
                    return { created: 0, updated: 0 };
                  },
            }}
            onToggleComplete={toggleComplete}
            onToggleSubtask={toggleSubtask}
            onEdit={openEditModal}
            onDelete={deleteTask}
            onMoveTask={moveTask}
            workDays={workDays}
          />
        )}

        {view === 'Kpi' && <KpiView tasks={tasks} />}

        {view === 'Settings' && (
          <SettingsView
            workDays={workDays}
            onChangeWorkDays={(days) => setWorkDays(normalizeWorkDays(days))}
            notificationSettings={notificationSettings}
            onChangeNotificationSettings={(next) =>
              setNotificationSettings((prev) => normalizeNotificationSettings({ ...prev, ...next }))
            }
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
            onSendTestNotification={sendTestNotification}
          />
        )}
      </main>

      <FloatingSmartBar onAddTask={addTask} onOpenAdvanced={openAddModal} />

      <TaskModal
        isOpen={modalOpen}
        task={editingTask}
        onClose={closeModal}
        onSave={handleSaveTask}
        workDays={workDays}
      />
    </div>
  );
}
