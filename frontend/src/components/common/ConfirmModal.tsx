import { useEffect } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
}: ConfirmModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const accentColor = isDanger ? '#ef4444' : '#f59e0b';
  const accentBgLight = isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--overlay-bg)',
        backdropFilter: 'blur(8px)',
        animation: 'confirmModalFadeIn 0.2s ease-out',
      }}
    >
      <style>{`
        @keyframes confirmModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes confirmModalScaleIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          borderRadius: 16,
          padding: 32,
          maxWidth: 400,
          width: '100%',
          boxShadow: 'var(--modal-shadow)',
          background: 'var(--surface-dropdown)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-accent)',
          margin: '0 16px',
          animation: 'confirmModalScaleIn 0.2s ease-out',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: accentBgLight,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          {isDanger ? (
            <svg width="24" height="24" fill="none" stroke={accentColor} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          ) : (
            <svg width="24" height="24" fill="none" stroke={accentColor} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          )}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            textAlign: 'center',
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-faint)',
            margin: '0 0 28px',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              fontWeight: 500,
              color: 'var(--text-faint)',
              background: 'var(--surface-sidebar-input)',
              border: '1px solid var(--border-accent)',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 10,
              fontWeight: 600,
              color: 'white',
              background: accentColor,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
