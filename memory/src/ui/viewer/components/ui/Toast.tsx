import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;  // ms, 0 = no auto-dismiss
  dismissible?: boolean;
  onClick?: () => void;
}

interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType, { bg: string; icon: string; iconColor: string }> = {
  success: { bg: 'alert-success', icon: 'lucide:check-circle', iconColor: 'text-success-content' },
  error: { bg: 'alert-error', icon: 'lucide:x-circle', iconColor: 'text-error-content' },
  info: { bg: 'alert-info', icon: 'lucide:info', iconColor: 'text-info-content' },
  warning: { bg: 'alert-warning', icon: 'lucide:alert-triangle', iconColor: 'text-warning-content' },
};

export function Toast({
  id,
  type,
  message,
  title,
  duration = 5000,
  dismissible = true,
  onClick,
  onDismiss,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const { bg, icon, iconColor } = typeStyles[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(id), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      role="alert"
      className={`alert ${bg} shadow-lg transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      } ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <Icon icon={icon} size={20} className={iconColor} />
      <div className="flex-1">
        {title && <h3 className="font-bold text-sm">{title}</h3>}
        <span className="text-sm">{message}</span>
      </div>
      {dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="btn btn-ghost btn-sm btn-circle"
          aria-label="Dismiss"
        >
          <Icon icon="lucide:x" size={16} />
        </button>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast toast-end toast-bottom z-50">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
