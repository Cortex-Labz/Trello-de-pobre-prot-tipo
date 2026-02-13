import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Workspace, User } from '../types';
import { workspaceService } from '../services/workspaceService';
import { invitationService } from '../services/invitationService';
import { useAuthStore } from '../store/authStore';
import UserSearchDropdown from './common/UserSearchDropdown';

interface WorkspaceMembersModalProps {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkspaceMembersModal({
  workspace,
  isOpen,
  onClose,
}: WorkspaceMembersModalProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  // Get current user's role in workspace
  const currentUserMember = workspace.members?.find(
    (m) => m.userId === currentUser?.id
  );
  const isAdmin = currentUserMember?.role === 'ADMIN' || workspace.ownerId === currentUser?.id;

  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) =>
      workspaceService.addMember(workspace.id, userId, role),
    onSuccess: () => {
      // Invalidate all workspace-related queries
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['boards', workspace.id] });
      setShowAddMember(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      workspaceService.removeMember(workspace.id, userId),
    onSuccess: () => {
      // Invalidate all workspace-related queries
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['boards', workspace.id] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'ADMIN' | 'MEMBER' }) =>
      workspaceService.updateMemberRole(workspace.id, userId, role),
    onSuccess: () => {
      // Invalidate all workspace-related queries
      queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['boards', workspace.id] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: 'ADMIN' | 'MEMBER' }) =>
      invitationService.inviteToWorkspace(workspace.id, email, role),
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

  const handleAddMember = (user: User) => {
    addMemberMutation.mutate({ userId: user.id, role: 'MEMBER' });
  };

  const handleRoleChange = (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este membro?')) {
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
  const memberUserIds = workspace.members?.map((m) => m.userId) || [];

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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-8 max-w-2xl w-full animate-slide-up mx-4 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--surface-primary)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Membros do Workspace
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
              <div className="space-y-2">
                <UserSearchDropdown
                  onSelectUser={handleAddMember}
                  excludeUserIds={memberUserIds}
                  placeholder="Buscar usuário por email ou nome..."
                />
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
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                    className="w-full px-3 py-2 rounded-lg outline-none"
                    style={{
                      background: 'var(--surface-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="flex-1 px-4 py-2 rounded-lg font-medium transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
          {/* Owner */}
          {workspace.owner && (
            <div
              className="p-4 rounded-xl flex items-center gap-4"
              style={{
                background: 'var(--surface-secondary)',
                border: '2px solid var(--border-color)',
              }}
            >
              {workspace.owner.avatarUrl ? (
                <img
                  src={workspace.owner.avatarUrl}
                  alt={workspace.owner.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {getInitials(workspace.owner.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {workspace.owner.name}
                  </p>
                  {workspace.owner.id === currentUser?.id && (
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
                  {workspace.owner.email}
                </p>
              </div>
              <span
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  background: 'linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%)',
                  color: 'white',
                }}
              >
                Owner
              </span>
            </div>
          )}

          {/* Other Members */}
          {workspace.members?.map((member) => (
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
                {isAdmin ? (
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.userId, e.target.value as 'ADMIN' | 'MEMBER')}
                    disabled={updateRoleMutation.isPending}
                    className="px-3 py-1 rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
                    style={{
                      background: member.role === 'ADMIN' ? 'var(--surface-hover)' : 'transparent',
                      color: 'var(--text-primary)',
                      border: `1px solid var(--border-color)`,
                    }}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                ) : (
                  <span
                    className="px-3 py-1 rounded-lg text-sm font-medium"
                    style={{
                      background: member.role === 'ADMIN' ? 'var(--surface-hover)' : 'transparent',
                      color: member.role === 'ADMIN' ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: `1px solid var(--border-color)`,
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

        {workspace.members?.length === 0 && (
          <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            Nenhum membro além do owner.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}
