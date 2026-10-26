import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map(toast => {
          const typeStyles = {
            critical: 'border-l-4 border-l-[#dc2626] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-overlay)]',
            warning: 'border-l-4 border-l-[#d97706] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-overlay)]',
            success: 'border-l-4 border-l-[#059669] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-overlay)]',
            info: 'border-l-4 border-l-[#0284c7] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-overlay)]'
          };

          const iconMap = {
            critical: <AlertCircle className="w-5 h-5 text-[#dc2626] shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-[#d97706] shrink-0" />,
            success: <CheckCircle className="w-5 h-5 text-[#059669] shrink-0" />,
            info: <Info className="w-5 h-5 text-[#0284c7] shrink-0" />
          };

          return (
            <div
              key={toast.id}
              role="alert"
              className={`p-3.5 rounded-lg flex items-start gap-3 pointer-events-auto transition-all duration-200 animate-in slide-in-from-bottom-2 ${
                typeStyles[toast.type] || typeStyles.info
              }`}
            >
              {iconMap[toast.type] || iconMap.info}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {toast.title}
                  </h4>
                )}
                {toast.message && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-0.5 rounded transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      addToast: () => {},
      removeToast: () => {}
    };
  }
  return context;
}
