import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = 'info', timeoutMs = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => t.concat({ id, message, type }));
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), timeoutMs);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`px-3 py-2 rounded shadow text-sm text-white ${
            t.type === 'error' ? 'bg-red-600' : t.type === 'success' ? 'bg-emerald-600' : 'bg-slate-900'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}


