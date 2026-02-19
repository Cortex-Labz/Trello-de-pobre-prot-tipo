import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Board } from '../types';
import { boardService } from '../services/boardService';
import { invitationService } from '../services/invitationService';
import { workspaceService } from '../services/workspaceService';
import { useAuthStore } from '../store/authStore';
import { useConfirmModal } from '../hooks/useConfirmModal';

interface BoardMembersModalProps {
  board: Board;
  isOpen: boolean;
  onClose: () => void;
}

export default function BoardMembersModal({
  board,
  isOpen,
  onClose,
}: BoardMembersModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const { confirm: confirmAction, ConfirmDialog } = useConfirmModal();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'OBSERVER'>('MEMBER');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);

  // Get current user's role in board
  const currentUserMember = board.members?.find(
    (m) => m.userId === currentUser?.id
  );
  const isAdmin = currentUserMember?.role === 'ADMIN';

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' | 'OBSERVER' }) =>
      boardService.addMember(board.id, userId, role),
    onSuccess: () => {
      // Invalidate all board-related queries
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards', board.workspaceId] });
      setShowAddMember(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      boardService.removeMember(board.id, userId),
    onSuccess: () => {
      // Invalidate all board-related queries
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards', board.workspaceId] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' | 'OBSERVER' }) =>
      boardService.updateMemberRole(board.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      queryClient.invalidateQueries({ queryKey: ['boards', board.workspaceId] });
      setRoleDropdownOpen(null);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'ADMIN' | 'MEMBER' | 'OBSERVER' }) =>
      invitationService.inviteToBoard(board.id, email, role),
    onSuccess: () => {
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteRole('MEMBER');
      alert('Convite enviado com sucesso!');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Erro ao enviar convite');
    },
  });

  const handleAddMember = (userId: string) => {
    addMemberMutation.mutate({ userId, role: 'MEMBER' });
  };

  const handleRemoveMember = async (userId: string) => {
    const confirmed = await confirmAction({
      title: 'Remover membro',
      message: 'Tem certeza que deseja remover este membro do board?',
      confirmText: 'Remover',
      variant: 'danger',
    });
    if (confirmed) {
      removeMemberMutation.mutate(userId);
    }
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert('Por favor, insira um email');
      return;
    }
    inviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get list of member user IDs to exclude from search
  const memberUserIds = board.members?.map((m) => m.userId) || [];

  // Fetch workspace members when add member section is open
  const { data: workspaceMembersData, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['workspaceMembers', board.workspaceId],
    queryFn: () => workspaceService.getWorkspaceMembers(board.workspaceId),
    enabled: showAddMember,
  });

  // Filter out users who are already board members
  const availableMembers = workspaceMembersData?.members?.filter(
    (m: any) => !memberUserIds.includes(m.id)
  ) || [];

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

  return createPortal(
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
        className="rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-slide-up mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--surface-primary)',
          backdropFilter: 'blur(10px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Membros do Board
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:rotate-90"
            style={{
              background: 'var(--surface-secondary)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Add Member Section */}
        {isAdmin && (
          <div className="mb-6">
            {!showAddMember ? (
              <button
                onClick={() => setShowAddMember(true)}
                className="w-full px-4 py-3 rounded-xl font-medium transition-all border-2 border-dashed"
                style={{
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-color)',
                  background: 'var(--surface-hover)',
                }}
              >
                + Adicionar Membro
              </button>
            ) : (
              <div className="space-y-3">
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-secondary)',
                  }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      Membros do Workspace
                    </p>
                  </div>
                  {isLoadingMembers ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Carregando membros...
                      </p>
                    </div>
                  ) : availableMembers.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Todos os membros do workspace ja estao no board
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {availableMembers.map((member: any) => (
                        <div
                          key={member.id}
                          className="px-4 py-3 flex items-center gap-3 transition-all"
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--surface-hover)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          {member.avatarUrl ? (
                            <img
                              src={member.avatarUrl}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                              {getInitials(member.name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                              {member.name}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                              {member.email}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddMember(member.id)}
                            disabled={addMemberMutation.isPending}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
                            style={{
                              background: 'var(--gradient-primary)',
                              color: 'white',
                            }}
                          >
                            Adicionar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Para adicionar, o membro precisa estar no workspace
                  </p>
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="text-sm px-3 py-1 rounded-lg"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-secondary)',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Invite by Email Section */}
        {isAdmin && (
          <div className="mb-6">
            {!showInviteForm ? (
              <button
                onClick={() => setShowInviteForm(true)}
                className="w-full px-4 py-3 rounded-xl font-medium transition-all border-2 border-dashed"
                style={{
                  color: 'var(--text-secondary)',
                  borderColor: 'var(--border-color)',
                  background: 'var(--surface-hover)',
                }}
              >
                ✉️ Convidar por Email
              </button>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-3 p-4 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Email do convidado
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER' | 'OBSERVER')}
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OBSERVER">Observador</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      background: 'var(--gradient-primary)',
                      color: 'white',
                    }}
                  >
                    {inviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                      setInviteRole('MEMBER');
                    }}
                    className="px-4 py-2 rounded-lg"
                    style={{
                      color: 'var(--text-secondary)',
                      background: 'var(--surface-primary)',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          {board.members?.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl flex items-center gap-4"
              style={{
                background: 'var(--surface-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {member.user.avatarUrl ? (
                <img
                  src={member.user.avatarUrl}
                  alt={member.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                  {getInitials(member.user.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {member.user.name}
                  </p>
                  {member.userId === currentUser?.id && (
                    <span
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        background: 'var(--surface-hover)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Você
                    </span>
                  )}
                </div>
                <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                  {member.user.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && member.userId !== currentUser?.id ? (
                  <div className="relative">
                    <button
                      onClick={() => setRoleDropdownOpen(roleDropdownOpen === member.id ? null : member.id)}
                      className="px-3 py-1 rounded-lg text-sm font-medium transition-all hover:scale-105 hover:brightness-110 cursor-pointer flex items-center gap-1.5"
                      style={{
                        background: member.role === 'ADMIN'
                          ? 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)'
                          : member.role === 'MEMBER'
                          ? 'var(--surface-hover)'
                          : 'transparent',
                        color: member.role === 'ADMIN'
                          ? 'white'
                          : member.role === 'MEMBER'
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)',
                        border: member.role === 'OBSERVER' ? '1px solid var(--border-color)' : 'none',
                      }}
                    >
                      {member.role}
                      <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {roleDropdownOpen === member.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setRoleDropdownOpen(null)} />
                        <div
                          className="absolute right-0 top-full mt-1 z-20 rounded-xl shadow-xl overflow-hidden"
                          style={{
                            background: 'var(--surface-primary)',
                            border: '1px solid var(--border-color)',
                            minWidth: '160px',
                          }}
                        >
                          {(['ADMIN', 'MEMBER', 'OBSERVER'] as const).map((role) => (
                            <button
                              key={role}
                              onClick={() => updateRoleMutation.mutate({ userId: member.userId, role })}
                              disabled={member.role === role || updateRoleMutation.isPending}
                              className="w-full text-left px-4 py-2.5 text-sm transition-all flex items-center justify-between disabled:opacity-40"
                              style={{
                                color: member.role === role ? 'var(--text-secondary)' : 'var(--text-primary)',
                                background: member.role === role ? 'var(--surface-hover)' : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (member.role !== role) e.currentTarget.style.background = 'var(--surface-hover)';
                              }}
                              onMouseLeave={(e) => {
                                if (member.role !== role) e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span className="font-medium">{role}</span>
                              {member.role === role && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <span
                    className="px-3 py-1 rounded-lg text-sm font-medium"
                    style={{
                      background: member.role === 'ADMIN'
                        ? 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)'
                        : member.role === 'MEMBER'
                        ? 'var(--surface-hover)'
                        : 'transparent',
                      color: member.role === 'ADMIN'
                        ? 'white'
                        : member.role === 'MEMBER'
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                      border: member.role === 'OBSERVER' ? '1px solid var(--border-color)' : 'none',
                    }}
                  >
                    {member.role}
                  </span>
                )}
                {isAdmin && member.userId !== currentUser?.id && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={removeMemberMutation.isPending}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: 'var(--surface-hover)',
                      color: '#ef4444',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {(!board.members || board.members.length === 0) && (
          <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            Nenhum membro no board ainda.
          </p>
        )}

        {/* Role Legend */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
          <p className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>
            Papéis:
          </p>
          <div className="space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p><strong>ADMIN:</strong> Controle total do board</p>
            <p><strong>MEMBER:</strong> Pode editar cards e listas</p>
            <p><strong>OBSERVER:</strong> Apenas visualização</p>
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>,
    document.body
  );
}
