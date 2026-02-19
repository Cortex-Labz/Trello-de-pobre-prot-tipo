import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../common/ThemeToggle';
import NotificationDropdown from '../common/NotificationDropdown';
import InvitationDropdown from '../common/InvitationDropdown';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <header
      className="sticky top-0 z-50 px-6 py-2 flex items-center justify-between shadow-lg border-b"
      style={{
        background: 'var(--surface-chrome)',
        backdropFilter: 'blur(20px)',
        boxShadow: 'var(--shadow-lg)',
        borderColor: 'var(--border-accent)',
      }}
    >
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-3 group" style={{ textDecoration: 'none' }}>
        <div
          className="flex items-center justify-center transition-transform group-hover:scale-105"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--gradient-primary)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        </div>
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: -0.3,
          background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>VersatlyTask</span>
      </Link>

      {/* Search Bar (center) */}
      <div className="flex-1 max-w-[520px] mx-auto px-4">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }}>
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Pesquisar cards, boards, workspaces..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[13px] transition-all focus:outline-none header-search-input"
            style={{
              background: 'var(--surface-input)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-accent-strong)',
            }}
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Invitations */}
        <InvitationDropdown />

        {/* Notifications */}
        <NotificationDropdown />

        {/* Settings */}
        <ThemeToggle />

        {/* Add Button */}
        <button
          className="px-4 h-10 rounded-xl flex items-center gap-2 transition-all hover:scale-105 font-semibold text-[13px] text-white"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: 'var(--shadow-glow)',
          }}
          title="Criar"
        >
          <svg
            className="w-[18px] h-[18px]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span>Criar</span>
        </button>

        {/* Divider */}
        <div className="w-px h-8 mx-1" style={{ background: 'var(--border-accent-strong)' }} />

        {/* User Avatar + Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all hover:scale-105 group"
            style={{
              background: 'var(--surface-input)',
              border: '1px solid var(--border-accent-medium)',
            }}
            title={user?.name}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                className="w-9 h-9 rounded-[10px] object-cover"
                alt={user.name}
              />
            ) : (
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white font-bold text-[13px]"
                style={{
                  background: 'var(--gradient-primary)',
                  boxShadow: 'var(--shadow-glow)',
                }}
              >
                {user && getInitials(user.name)}
              </div>
            )}
            <div className="hidden md:block text-left pr-2">
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Ver perfil
              </div>
            </div>
          </button>

          {showUserMenu && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-2xl py-2 z-50"
              style={{
                background: 'var(--surface-dropdown)',
                border: '1px solid var(--border-accent-strong)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-accent)' }}>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5 mt-1"
                style={{ color: 'var(--text-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Editar perfil
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10 text-red-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
