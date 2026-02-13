import { useEffect, useState } from 'react';
import { NotificationData } from '../../types/notification';

interface ToastProps {
  notification: NotificationData;
  onClose: () => void;
  duration?: number;
}

export function NotificationToast({ notification, onClose, duration = 5000 }: ToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300); // Duração da animação
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'MENTION':
        return '💬';
      case 'ASSIGNMENT':
        return '👤';
      case 'COMMENT':
        return '💭';
      case 'DUE_DATE':
        return '⏰';
      case 'CARD_MOVED':
        return '🔄';
      default:
        return '🔔';
    }
  };

  return (
    <div
      className={`
        w-96 p-4 rounded-2xl shadow-2xl border backdrop-blur-lg
        transform transition-all duration-300 ease-out
        ${isLeaving ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      style={{
        background: 'var(--surface-primary)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 10px 40px var(--shadow-color)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
          }}
        >
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
            Nova notificação
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {notification.content}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          style={{
            background: 'var(--surface-secondary)',
            color: 'var(--text-tertiary)',
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div
        className="mt-3 h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--surface-secondary)' }}
      >
        <div
          className="h-full rounded-full animate-progress"
          style={{
            background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
            animation: `shrink ${duration}ms linear`,
          }}
        />
      </div>

      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Container para múltiplos toasts
interface ToastContainerProps {
  notifications: NotificationData[];
  onRemove: (id: string) => void;
}

export function NotificationToastContainer({ notifications, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationToast notification={notification} onClose={() => onRemove(notification.id)} />
        </div>
      ))}
    </div>
  );
}
