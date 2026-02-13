import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invitationService, Invitation } from '../../services/invitationService';

export default function InvitationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['myInvitations'],
    queryFn: () => invitationService.getMyInvitations(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const invitations = data?.invitations || [];
  const invitationCount = invitations.length;

  const acceptMutation = useMutation({
    mutationFn: (token: string) => invitationService.acceptInvitation(token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['myInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setIsOpen(false);

      // Redirect based on invitation type
      if (data.type === 'WORKSPACE' && data.workspaceId) {
        navigate('/dashboard');
      } else if (data.type === 'BOARD' && data.boardId) {
        navigate(`/board/${data.boardId}`);
      }
    },
  });

  const declineMutation = useMutation({
    mutationFn: (token: string) => invitationService.declineInvitation(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myInvitations'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getInvitationTypeLabel = (invitation: Invitation) => {
    if (invitation.type === 'WORKSPACE') {
      return invitation.workspace?.name || 'workspace';
    }
    return invitation.board?.name || 'board';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Invitation Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105 relative group"
        style={{
          background: isOpen ? 'var(--surface-tertiary)' : 'var(--surface-secondary)',
          color: 'var(--text-secondary)',
        }}
        title="Convites"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
          />
        </svg>
        {invitationCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-lg">
            {invitationCount > 9 ? '9+' : invitationCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{
            background: 'var(--surface-primary)',
            border: '1px solid var(--border-color)',
            maxHeight: '500px',
          }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Convites Pendentes
            </h3>
            {invitationCount > 0 && (
              <span
                className="text-xs font-medium px-2 py-1 rounded-lg"
                style={{
                  background: 'var(--surface-secondary)',
                  color: 'var(--text-secondary)',
                }}
              >
                {invitationCount} {invitationCount === 1 ? 'convite' : 'convites'}
              </span>
            )}
          </div>

          {/* Invitations List */}
          <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
            {isLoading ? (
              <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>
                Carregando...
              </div>
            ) : invitations.length === 0 ? (
              <div className="p-8 text-center">
                <div
                  className="w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--surface-secondary)' }}
                >
                  <svg
                    className="w-8 h-8"
                    style={{ color: 'var(--text-tertiary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                    />
                  </svg>
                </div>
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Nenhum convite pendente
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Você não tem convites no momento.
                </p>
              </div>
            ) : (
              invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="px-4 py-4 border-b"
                  style={{
                    borderColor: 'var(--border-color)',
                    background: 'var(--surface-secondary)',
                  }}
                >
                  <div className="flex gap-3 mb-3">
                    {/* Inviter Avatar */}
                    {invitation.inviter.avatarUrl ? (
                      <img
                        src={invitation.inviter.avatarUrl}
                        alt={invitation.inviter.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {invitation.inviter.name[0].toUpperCase()}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {invitation.inviter.name}
                        </span>{' '}
                        convidou você para
                      </p>
                      <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {getInvitationTypeLabel(invitation)}
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            background: invitation.role === 'ADMIN'
                              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              : 'var(--surface-hover)',
                            color: invitation.role === 'ADMIN' ? 'white' : 'var(--text-primary)',
                          }}
                        >
                          {invitation.role}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          • {formatTime(invitation.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptMutation.mutate(invitation.token)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                      }}
                    >
                      {acceptMutation.isPending ? 'Aceitando...' : 'Aceitar'}
                    </button>
                    <button
                      onClick={() => declineMutation.mutate(invitation.token)}
                      disabled={acceptMutation.isPending || declineMutation.isPending}
                      className="px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                      style={{
                        background: 'var(--surface-primary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {declineMutation.isPending ? 'Recusando...' : 'Recusar'}
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/accept-invitation/${invitation.token}`);
                        setIsOpen(false);
                      }}
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: 'var(--surface-primary)',
                        color: 'var(--text-secondary)',
                      }}
                      title="Ver detalhes"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
