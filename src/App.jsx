import { useEffect, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import FloatingSmartBar from './components/QuickAdd';
import QuadrantBoard from './components/QuadrantBoard';
import TimelineView from './components/TimelineView';
import GanttView from './components/GanttView';
import PendingView from './components/PendingView';
import KpiView from './components/KpiView';
import TaskModal from './components/TaskModal';
import ViewSwitcher from './components/ViewSwitcher';
import { useTasks } from './hooks/useTasks';
import { useToast } from './hooks/useToast';
import { exportTasksAsCsv, exportTasksAsXlsx, readImportFile } from './utils/importExport';

const THEME_KEY = 'mahd_theme_react_v1';

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
    moveTask,
    rescheduleTask,
    replaceAllTasks,
    refetch,
  } = useTasks(showToast);

  const [view, setView] = useState('Matrix');
  const [subview, setSubview] = useState('Board');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const editingTask = useMemo(
    () => tasks.find((t) => t.id === editingTaskId) || null,
    [tasks, editingTaskId]
  );

  const pendingCount = tasks.filter((t) => !t.completed).length;

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
    if (id) {
      updateTask(id, form.title, form.quadrant, form.dueDate, form.notes, form.duration);
    } else {
      addTask(form.title, form.quadrant, form.dueDate, form.notes, form.duration);
    }
    closeModal();
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
        `سيتم حذف جميع المهام الحالية (${tasks.length}) واستبدالها بـ ${imported.length} مهمة من الملف.\n\nهل أنت متأكد؟ لا يمكن التراجع عن هذه العملية.`
      );

      if (!confirmed) {
        showToast('تم إلغاء الاستيراد', 'ph-info');
        return;
      }

      await replaceAllTasks(imported);
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء قراءة الملف', 'ph-x-circle', 'error');
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-color, #f1f5f9)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 52,
              height: 52,
              border: '4px solid var(--border-color, #e2e8f0)',
              borderTopColor: 'var(--accent, #3b82f6)',
              borderRadius: '50%',
              animation: 'spin 0.75s linear infinite',
              margin: '0 auto 20px',
            }}
          />
          <p style={{ fontSize: 16, fontWeight: 400, color: 'var(--text-secondary)' }}>
            جاري تحميل المهام…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!connected) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--bg-color, #f1f5f9)',
          padding: 24,
        }}
      >
        <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: 40 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'var(--danger-light)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 20px',
            }}
          >
            <i className="ph ph-plugs-connected"></i>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>غير متصل بقاعدة البيانات</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            تأكد من ملف <code>.env</code> ثم أعد تشغيل <code>npm run dev</code>.
          </p>
          <button className="btn-primary" onClick={() => refetch()} style={{ margin: '0 auto' }}>
            <i className="ph ph-arrow-clockwise"></i>
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="mobile-header">
        <div className="logo-area" style={{ marginBottom: 0 }}>
          <div className="logo-icon" style={{ width: 36, height: 36, fontSize: 18 }}>
            <i className="ph ph-tree-evergreen"></i>
          </div>
          <div className="logo-text" style={{ fontSize: 20 }}>
            مهد
          </div>
        </div>
        <button className="btn-icon" onClick={() => setSidebarOpen(true)}>
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
        totalCount={tasks.length}
        connected={connected}
        onExport={handleExport}
        onImportFile={handleImportFile}
      />

      <main className="main-content">
        {view === 'Matrix' && (
          <div id="viewMatrix">
            {subview === 'Board' && (
              <QuadrantBoard
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onEdit={openEditModal}
                onDelete={deleteTask}
                onMoveTask={moveTask}
              />
            )}
            {subview === 'Timeline' && (
              <TimelineView
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onEdit={openEditModal}
                onDelete={deleteTask}
              />
            )}
            {subview === 'Gantt' && (
              <GanttView
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onEdit={openEditModal}
                onReschedule={rescheduleTask}
              />
            )}
          </div>
        )}

        {view === 'Pending' && (
          <PendingView
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onEdit={openEditModal}
            onDelete={deleteTask}
          />
        )}

        {view === 'Kpi' && <KpiView tasks={tasks} />}
      </main>

      {view === 'Matrix' && <ViewSwitcher subview={subview} onSwitch={setSubview} />}

      {/* شريط المساعد الذكي العائم */}
      <FloatingSmartBar onAddTask={addTask} onOpenAdvanced={openAddModal} />

      <TaskModal isOpen={modalOpen} task={editingTask} onClose={closeModal} onSave={handleSaveTask} />
    </div>
  );
}
