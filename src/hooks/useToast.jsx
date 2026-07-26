import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, icon = 'ph-check-circle', variant = 'default') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg, icon, variant, show: false }]);
    // فعل الأنيميشن في الإطار التالي
    requestAnimationFrame(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, show: true } : t)));
    });
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, show: false } : t)));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.show ? 'show' : ''} ${t.variant === 'error' ? 'error' : ''}`}>
            <i className={`ph ${t.icon}`}></i> {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
