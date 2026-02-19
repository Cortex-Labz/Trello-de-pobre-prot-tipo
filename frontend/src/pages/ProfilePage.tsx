import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authService } from '../services/authService';

// Inject keyframes once
const ppStyleId = 'profile-page-keyframes';
function injectProfileKeyframes() {
  if (document.getElementById(ppStyleId)) return;
  const style = document.createElement('style');
  style.id = ppStyleId;
  style.textContent = `
    @keyframes pp-drift {
      0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

const profileParticles = [
  { left: '8%', duration: '20s', delay: '0s', size: 2 },
  { left: '22%', duration: '24s', delay: '4s', size: 3 },
  { left: '38%', duration: '18s', delay: '7s', size: 2 },
  { left: '52%', duration: '22s', delay: '2s', size: 3 },
  { left: '68%', duration: '26s', delay: '5s', size: 2 },
  { left: '82%', duration: '21s', delay: '8s', size: 3 },
  { left: '92%', duration: '19s', delay: '1s', size: 2 },
];

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function formatMemberSince(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' };
  if (pw.length < 4) return { level: 1, label: 'Fraca', color: '#ef4444' };
  if (pw.length < 6) return { level: 2, label: 'Curta', color: '#f59e0b' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = (pw.length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);
  if (score >= 3) return { level: 4, label: 'Forte', color: '#34d399' };
  if (score >= 2) return { level: 3, label: 'Boa', color: '#667eea' };
  return { level: 2, label: 'Media', color: '#f59e0b' };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  useEffect(() => {
    injectProfileKeyframes();
  }, []);

  // Tabs
  const [activeTab, setActiveTab] = useState<'perfil' | 'seguranca'>('perfil');

  // Name editing
  const [name, setName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const res = await authService.uploadAvatar(base64);
          updateUser(res.user);
        } catch (err: any) {
          console.error('Avatar upload failed:', err);
        } finally {
          setAvatarUploading(false);
        }
      };
      reader.onerror = () => {
        setAvatarUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setAvatarUploading(false);
    }
    // Reset so the same file can be selected again
    e.target.value = '';
  };

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMsg(null);
    try {
      const res = await authService.updateProfile({ name: name.trim() });
      updateUser(res.user);
      setNameMsg({ type: 'success', text: 'Nome atualizado com sucesso!' });
    } catch (err: any) {
      setNameMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao atualizar nome.' });
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'As senhas nao coincidem.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.response?.data?.error || 'Erro ao alterar senha.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const pwStrength = getPasswordStrength(newPassword);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--surface-base)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient accents */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        left: '-10%',
        width: '50%',
        height: '50%',
        background: 'radial-gradient(circle, var(--accent-bg-subtle) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-20%',
        right: '-10%',
        width: '50%',
        height: '50%',
        background: 'radial-gradient(circle, var(--accent-bg-subtle) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Dot grid */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'radial-gradient(circle, var(--auth-grid-line) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 10%, transparent 65%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black 10%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      {/* Particles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {profileParticles.map((p, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'var(--auth-particle)',
            left: p.left,
            animation: `pp-drift ${p.duration} linear infinite`,
            animationDelay: p.delay,
          }} />
        ))}
      </div>

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '40px 20px 60px',
      }}>
        <div style={{ width: '100%', maxWidth: 700 }}>

          {/* Header: back + title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 32,
            animation: 'pp-fadeInDown 0.4s ease-out',
          }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: '1px solid var(--border-accent-medium)',
                background: 'var(--surface-card-solid)',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-bg-medium)';
                e.currentTarget.style.borderColor = 'var(--accent-bg-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--surface-card-solid)';
                e.currentTarget.style.borderColor = 'var(--border-accent-medium)';
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 style={{
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}>Meu Perfil</h1>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 0,
            marginBottom: 28,
            position: 'relative',
            borderBottom: '1px solid var(--border-default)',
            animation: 'pp-fadeInDown 0.45s ease-out',
          }}>
            {(['perfil', 'seguranca'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const label = tab === 'perfil' ? 'Perfil' : 'Seguranca';
              const icon = tab === 'perfil' ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: isActive ? 1 : 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ opacity: isActive ? 1 : 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              );
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    background: 'none',
                    border: 'none',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-dimmed)',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'color 0.25s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-faint)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--text-dimmed)';
                  }}
                >
                  {icon}
                  {label}
                  {/* Active indicator */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: -1,
                      left: 16,
                      right: 16,
                      height: 2,
                      borderRadius: 1,
                      background: 'var(--gradient-nav-bar)',
                      animation: 'pp-tabSlide 0.3s ease-out',
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div key={activeTab} style={{ animation: 'pp-tabFadeIn 0.35s ease-out' }}>

            {activeTab === 'perfil' && (
              <>
                {/* Hero card: Avatar + Info */}
                <div style={{
                  background: 'var(--surface-card-solid)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 16,
                  padding: '28px 32px',
                  marginBottom: 20,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Subtle gradient glow at top */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'linear-gradient(90deg, transparent 0%, var(--accent-bg-strong) 30%, var(--accent-bg-strong) 70%, transparent 100%)',
                  }} />

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                  }}>
                    {/* Avatar */}
                    <div
                      onClick={handleAvatarClick}
                      className="pp-avatar-wrapper"
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: '50%',
                        position: 'relative',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        flexShrink: 0,
                        boxShadow: '0 0 0 3px var(--border-accent-medium), var(--shadow-lg)',
                      }}
                    >
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'var(--gradient-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 36,
                          fontWeight: 700,
                          color: 'white',
                        }}>
                          {user ? getInitials(user.name) : ''}
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div
                        className="pp-avatar-overlay"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'var(--overlay-bg)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: avatarUploading ? 1 : 0,
                          transition: 'opacity 0.25s ease',
                          borderRadius: '50%',
                        }}
                      >
                        {avatarUploading ? (
                          <div style={{
                            width: 26,
                            height: 26,
                            border: '3px solid var(--border-visible)',
                            borderTopColor: 'white',
                            borderRadius: '50%',
                            animation: 'pp-spin 0.8s linear infinite',
                          }} />
                        ) : (
                          <svg width="26" height="26" fill="none" stroke="white" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileSelect}
                    />

                    {/* Info */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h2 style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        margin: '0 0 4px 0',
                        letterSpacing: '-0.01em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {user?.name}
                      </h2>
                      <p style={{
                        fontSize: 14,
                        color: 'var(--text-faint)',
                        margin: '0 0 10px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {user?.email}
                      </p>
                      {user?.createdAt && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 12,
                          color: 'var(--text-dimmed)',
                          background: 'var(--accent-bg-subtle)',
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--accent-bg)',
                        }}>
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Membro desde {formatMemberSince(user.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Two cards: Name + Email */}
                <div className="pp-cards-row" style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                  marginBottom: 20,
                }}>
                  {/* Name Card */}
                  <div style={{
                    background: 'var(--surface-card-solid)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 16,
                    padding: '24px',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 18,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'var(--border-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="16" height="16" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Nome de exibicao
                      </span>
                    </div>

                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 10,
                        border: '1.5px solid var(--accent-bg-medium)',
                        background: 'var(--surface-input)',
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-bg-strong)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-accent-medium)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-bg-medium)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                      <button
                        onClick={handleSaveName}
                        disabled={nameSaving || !name.trim()}
                        style={{
                          padding: '9px 20px',
                          borderRadius: 10,
                          border: 'none',
                          background: 'var(--gradient-primary)',
                          color: 'white',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: nameSaving || !name.trim() ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: nameSaving || !name.trim() ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                          if (!nameSaving && name.trim()) e.currentTarget.style.transform = 'scale(1.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        {nameSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>

                    {nameMsg && (
                      <div style={{
                        fontSize: 13,
                        marginTop: 12,
                        padding: '8px 12px',
                        borderRadius: 10,
                        background: nameMsg.type === 'success' ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                        color: nameMsg.type === 'success' ? '#34d399' : '#ef4444',
                        border: `1px solid ${nameMsg.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                        animation: 'pp-toastIn 0.3s ease-out',
                      }}>
                        {nameMsg.text}
                      </div>
                    )}
                  </div>

                  {/* Email Card */}
                  <div style={{
                    background: 'var(--surface-card-solid)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 16,
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginBottom: 18,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: 'var(--border-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <svg width="16" height="16" fill="none" stroke="var(--accent-2)" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Email
                      </span>
                      <svg width="14" height="14" fill="none" stroke="var(--text-dimmed)" viewBox="0 0 24 24" style={{ marginLeft: 'auto' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>

                    <div style={{
                      padding: '11px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border-subtle)',
                      background: 'var(--surface-input)',
                      color: 'var(--text-dimmed)',
                      fontSize: 14,
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {user?.email}
                    </div>

                    <p style={{
                      fontSize: 12,
                      color: 'var(--text-dimmed)',
                      margin: '12px 0 0 0',
                      lineHeight: 1.5,
                    }}>
                      O email nao pode ser alterado. Entre em contato com o suporte se necessario.
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'seguranca' && (
              <div style={{
                background: 'var(--surface-card-solid)',
                border: '1px solid var(--border-default)',
                borderRadius: 16,
                padding: '28px 32px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Top border glow */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  background: 'linear-gradient(90deg, transparent 0%, var(--accent-bg-strong) 30%, var(--accent-bg-strong) 70%, transparent 100%)',
                }} />

                {/* Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 28,
                }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--border-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="20" height="20" fill="none" stroke="var(--accent)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}>Alterar Senha</h3>
                    <p style={{
                      fontSize: 13,
                      color: 'var(--text-dimmed)',
                      margin: '2px 0 0 0',
                    }}>Mantenha sua conta segura com uma senha forte</p>
                  </div>
                </div>

                {/* Password fields */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-faint)',
                    marginBottom: 6,
                    display: 'block',
                  }}>Senha atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha atual"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--accent-bg-medium)',
                      background: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-bg-strong)';
                      e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-accent-medium)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-bg-medium)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-faint)',
                    marginBottom: 6,
                    display: 'block',
                  }}>Nova senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 6 caracteres"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--accent-bg-medium)',
                      background: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-bg-strong)';
                      e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-accent-medium)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-bg-medium)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div style={{
                    marginBottom: 18,
                    animation: 'pp-toastIn 0.25s ease-out',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6,
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--text-dimmed)' }}>Forca da senha</span>
                      <span style={{ fontSize: 11, color: pwStrength.color, fontWeight: 600 }}>{pwStrength.label}</span>
                    </div>
                    <div style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--border-subtle)',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${(pwStrength.level / 4) * 100}%`,
                        borderRadius: 2,
                        background: pwStrength.color,
                        transition: 'width 0.4s ease, background 0.4s ease',
                      }} />
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 18, marginTop: newPassword.length > 0 ? 0 : 10 }}>
                  <label style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--text-faint)',
                    marginBottom: 6,
                    display: 'block',
                  }}>Confirmar nova senha</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--accent-bg-medium)',
                      background: 'var(--surface-input)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-bg-strong)';
                      e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-accent-medium)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-bg-medium)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Mismatch warning */}
                {confirmPassword && newPassword && confirmPassword !== newPassword && (
                  <div style={{
                    fontSize: 12,
                    color: '#f59e0b',
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    animation: 'pp-toastIn 0.25s ease-out',
                  }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    As senhas nao coincidem
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                    style={{
                      padding: '11px 28px',
                      borderRadius: 10,
                      border: 'none',
                      background: 'var(--gradient-primary)',
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: passwordSaving || !currentPassword || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: passwordSaving || !currentPassword || !newPassword || !confirmPassword ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!passwordSaving && currentPassword && newPassword && confirmPassword) {
                        e.currentTarget.style.transform = 'scale(1.04)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {passwordSaving ? 'Alterando...' : 'Alterar senha'}
                  </button>
                </div>

                {passwordMsg && (
                  <div style={{
                    fontSize: 13,
                    marginTop: 16,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: passwordMsg.type === 'success' ? 'rgba(52, 211, 153, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    color: passwordMsg.type === 'success' ? '#34d399' : '#ef4444',
                    border: `1px solid ${passwordMsg.type === 'success' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    animation: 'pp-toastIn 0.3s ease-out',
                  }}>
                    {passwordMsg.type === 'success' ? (
                      <svg width="16" height="16" fill="none" stroke="#34d399" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    {passwordMsg.text}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes pp-fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pp-tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pp-tabSlide {
          from { opacity: 0; transform: scaleX(0.3); }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes pp-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pp-toastIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Avatar hover overlay */
        .pp-avatar-wrapper:hover .pp-avatar-overlay {
          opacity: 1 !important;
        }

        /* Responsive: stack cards on narrow screens */
        @media (max-width: 600px) {
          .pp-cards-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
