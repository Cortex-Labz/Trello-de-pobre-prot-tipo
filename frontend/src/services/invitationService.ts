import { api } from './api';

export interface Invitation {
  id: string;
  email: string;
  token: string;
  type: 'WORKSPACE' | 'BOARD';
  workspaceId?: string;
  boardId?: string;
  role: string;
  invitedBy: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  inviter: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  workspace?: {
    id: string;
    name: string;
  };
  board?: {
    id: string;
    name: string;
  };
}

export const invitationService = {
  // Invite to workspace
  async inviteToWorkspace(
    workspaceId: string,
    email: string,
    role: 'ADMIN' | 'MEMBER'
  ): Promise<{ invitation: Invitation }> {
    const response = await api.post<{ invitation: Invitation }>(
      `/invitations/workspaces/${workspaceId}/invite`,
      { email, role }
    );
    return response.data;
  },

  // Invite to board
  async inviteToBoard(
    boardId: string,
    email: string,
    role: 'ADMIN' | 'MEMBER' | 'OBSERVER'
  ): Promise<{ invitation: Invitation }> {
    const response = await api.post<{ invitation: Invitation }>(
      `/invitations/boards/${boardId}/invite`,
      { email, role }
    );
    return response.data;
  },

  // Get my pending invitations
  async getMyInvitations(): Promise<{ invitations: Invitation[] }> {
    const response = await api.get<{ invitations: Invitation[] }>('/invitations');
    return response.data;
  },

  // Accept invitation
  async acceptInvitation(token: string): Promise<{
    message: string;
    type: 'WORKSPACE' | 'BOARD';
    workspaceId?: string;
    boardId?: string;
  }> {
    const response = await api.post(`/invitations/${token}/accept`);
    return response.data;
  },

  // Decline invitation
  async declineInvitation(token: string): Promise<{ message: string }> {
    const response = await api.post(`/invitations/${token}/decline`);
    return response.data;
  },

  // Cancel invitation (by inviter)
  async cancelInvitation(invitationId: string): Promise<{ message: string }> {
    const response = await api.delete(`/invitations/${invitationId}`);
    return response.data;
  },
};
