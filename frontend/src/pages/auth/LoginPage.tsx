import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';

// Inject keyframes once
const styleId = 'login-page-keyframes';
function injectKeyframes() {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

    @keyframes lp-pulse {
      0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
    }
    @keyframes lp-drift {
      0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
    }
    @keyframes lp-cardAppear {
      from { opacity: 0; transform: translateY(24px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes lp-slideDown {
      from { opacity: 0; transform: translateY(-16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes lp-fieldIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes lp-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes lp-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

const particles = [
  { left: '10%', duration: '18s', delay: '0s', size: 2 },
  { left: '25%', duration: '22s', delay: '3s', size: 3 },
  { left: '40%', duration: '16s', delay: '6s', size: 2 },
  { left: '55%', duration: '20s', delay: '1s', size: 3 },
  { left: '70%', duration: '24s', delay: '4s', size: 2 },
  { left: '85%', duration: '19s', delay: '7s', size: 3 },
  { left: '15%', duration: '21s', delay: '9s', size: 4, opacity: 0.15 },
  { left: '60%', duration: '17s', delay: '2s', size: 4, opacity: 0.15 },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  useEffect(() => {
    injectKeyframes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080a13',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        {/* Base gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse 70% 50% at 50% 0%, rgba(102, 126, 234, 0.12) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 20% 80%, rgba(118, 75, 162, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 80% 80%, rgba(102, 126, 234, 0.06) 0%, transparent 50%),
            #080a13
          `,
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(102, 126, 234, 0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(102, 126, 234, 0.025) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 40%, black 20%, transparent 70%)',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.07) 0%, transparent 70%)',
          filter: 'blur(40px)',
          animation: 'lp-pulse 8s ease-in-out infinite',
        }} />
        {/* Particles */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {particles.map((p, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: 'rgba(102, 126, 234, 0.3)',
              left: p.left,
              animation: `lp-drift ${p.duration} linear infinite`,
              animationDelay: p.delay,
              opacity: p.opacity ?? 1,
            }} />
          ))}
        </div>
      </div>

      {/* Login Container */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 440,
        padding: '0 20px',
      }}>
        {/* Brand */}
        <div style={{
          textAlign: 'center',
          marginBottom: 32,
          animation: 'lp-slideDown 0.7s ease-out both',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3), 0 0 60px rgba(102, 126, 234, 0.1)',
            marginBottom: 16,
          }}>
            <svg width="28" height="28" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div style={{
            fontSize: 26,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #e4e6eb 0%, #a3b1e8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: -0.5,
            marginBottom: 6,
          }}>
            VersatlyTask
          </div>
          <div style={{ fontSize: 14, color: '#5a5f7a', fontWeight: 400 }}>
            Gerencie projetos com simplicidade
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(14, 16, 28, 0.7)',
          border: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: 24,
          padding: '40px 36px',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03) inset, 0 1px 0 rgba(255, 255, 255, 0.04) inset',
          animation: 'lp-cardAppear 0.8s ease-out both',
          animationDelay: '0.15s',
        }}>
          {/* Card Header */}
          <div style={{
            marginBottom: 28,
            animation: 'lp-fieldIn 0.5s ease-out both',
            animationDelay: '0.3s',
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#e4e6eb', marginBottom: 6 }}>
              Bem-vindo de volta
            </h2>
            <p style={{ fontSize: 14, color: '#5a5f7a' }}>
              Entre na sua conta para continuar
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 14,
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <svg width="18" height="18" fill="none" stroke="#ef4444" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span style={{ fontSize: 13, color: '#f87171', fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{
              marginBottom: 18,
              animation: 'lp-fieldIn 0.5s ease-out both',
              animationDelay: '0.5s',
            }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8b8fa3', marginBottom: 7 }}>
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 16px 13px 44px',
                    borderRadius: 14,
                    border: `1.5px solid ${emailFocused ? 'rgba(102, 126, 234, 0.45)' : 'rgba(102, 126, 234, 0.08)'}`,
                    background: emailFocused ? 'rgba(15, 17, 28, 1)' : 'rgba(15, 17, 28, 0.8)',
                    color: '#e4e6eb',
                    fontSize: 14,
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'all 0.25s ease',
                    boxShadow: emailFocused ? '0 0 0 3px rgba(102, 126, 234, 0.06)' : 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: emailFocused ? '#667eea' : '#333758',
                  transition: 'color 0.25s',
                  pointerEvents: 'none',
                }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <div style={{
              marginBottom: 18,
              animation: 'lp-fieldIn 0.5s ease-out both',
              animationDelay: '0.55s',
            }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#8b8fa3', marginBottom: 7 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%',
                    padding: '13px 44px 13px 44px',
                    borderRadius: 14,
                    border: `1.5px solid ${passwordFocused ? 'rgba(102, 126, 234, 0.45)' : 'rgba(102, 126, 234, 0.08)'}`,
                    background: passwordFocused ? 'rgba(15, 17, 28, 1)' : 'rgba(15, 17, 28, 0.8)',
                    color: '#e4e6eb',
                    fontSize: 14,
                    fontFamily: "'Inter', sans-serif",
                    outline: 'none',
                    transition: 'all 0.25s ease',
                    boxShadow: passwordFocused ? '0 0 0 3px rgba(102, 126, 234, 0.06)' : 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: passwordFocused ? '#667eea' : '#333758',
                  transition: 'color 0.25s',
                  pointerEvents: 'none',
                }}>
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#333758',
                    cursor: 'pointer',
                    padding: 2,
                    transition: 'color 0.25s',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#667eea')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#333758')}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Options Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
              animation: 'lp-fieldIn 0.5s ease-out both',
              animationDelay: '0.6s',
            }}>
              <label
                onClick={() => setRememberMe(!rememberMe)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#6b7094',
                }}
              >
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  border: rememberMe ? 'none' : '1.5px solid rgba(102, 126, 234, 0.15)',
                  background: rememberMe ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'rgba(15, 17, 28, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24" style={{ opacity: rememberMe ? 1 : 0, transition: 'opacity 0.15s' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                Lembrar de mim
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  fontSize: 13,
                  color: '#667eea',
                  textDecoration: 'none',
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#667eea')}
              >
                Esqueceu a senha?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: 14,
                borderRadius: 14,
                border: 'none',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.25)',
                opacity: loading ? 0.7 : 1,
                animation: 'lp-fieldIn 0.5s ease-out both',
                animationDelay: '0.65s',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(102, 126, 234, 0.35)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.25)';
              }}
            >
              <span style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}>
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation: 'lp-spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Card Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: 24,
            paddingTop: 20,
            borderTop: '1px solid rgba(102, 126, 234, 0.06)',
            animation: 'lp-fieldIn 0.5s ease-out both',
            animationDelay: '0.7s',
          }}>
            <p style={{ fontSize: 13, color: '#4a4f6a' }}>
              Ainda nao tem conta?{' '}
              <Link
                to="/register"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontWeight: 600,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#a78bfa')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#667eea')}
              >
                Criar conta gratis
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom Features */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          marginTop: 28,
          animation: 'lp-fadeIn 1s ease-out both',
          animationDelay: '0.6s',
        }}>
          {['Tempo real', 'Colaborativo', 'Drag & Drop', 'Seguro'].map((feat) => (
            <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#3d4162', fontWeight: 500 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#667eea', opacity: 0.5 }} />
              {feat}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

