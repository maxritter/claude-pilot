import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { ToastContainer, ToastData, ToastType } from '../components/ui/Toast';

interface ToastContextValue {
  addToast: (toast: Omit<ToastData, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  // Convenience methods
  success: (message: string, title?: string) => string;
  error: (message: string, title?: string) => string;
  info: (message: string, title?: string) => string;
  warning: (message: string, title?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>): string => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback(
    (message: string, title?: string) => addToast({ type: 'success', message, title }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => addToast({ type: 'error', message, title, duration: 8000 }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => addToast({ type: 'info', message, title }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => addToast({ type: 'warning', message, title, duration: 7000 }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ addToast, removeToast, clearAll, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
