import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useThemeStore, ThemeName } from '../../store/themeStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themes: { name: ThemeName; label: string; gradient: string }[] = [
  {
    name: 'light',
    label: 'Light Mode',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    name: 'dark',
    label: 'Dark Mode',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  {
    name: 'ocean',
    label: 'Ocean Blue',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
  },
  {
    name: 'sunset',
    label: 'Sunset',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleThemeChange = (themeName: ThemeName) => {
    setTheme(themeName);
  };

  const modalContent = (
    <div
      className="fixed animate-fade-in"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--overlay-bg)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up"
        style={{
          background: 'var(--surface-primary)',
          backdropFilter: 'blur(20px)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Configurações
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:rotate-90"
            style={{
              background: 'var(--surface-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Theme Section */}
        <div className="mb-7">
          <label
            className="block text-sm font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            Tema do Aplicativo
          </label>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((t) => (
              <button
                key={t.name}
                onClick={() => handleThemeChange(t.name)}
                className={`p-4 rounded-xl border-2 transition-all hover:translate-y-[-4px] hover:shadow-lg relative ${
                  theme === t.name ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  borderColor: theme === t.name ? 'var(--bg-gradient-start)' : 'var(--border-color)',
                  background: theme === t.name
                    ? 'var(--gradient-nav-active)'
                    : 'transparent',
                }}
              >
                {/* Preview */}
                <div
                  className="w-full h-16 rounded-lg mb-2"
                  style={{ background: t.gradient }}
                />

                {/* Name */}
                <div
                  className="text-sm font-semibold text-center"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t.label}
                </div>

                {/* Checkmark */}
                {theme === t.name && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{
                      background: t.gradient,
                    }}
                  >
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
