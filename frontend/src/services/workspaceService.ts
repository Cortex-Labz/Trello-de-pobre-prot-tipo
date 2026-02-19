import { api } from './api';
import { Workspace } from '../types';

export const workspaceService = {
  async getWorkspaces(): Promise<{ workspaces: Workspace[] }> {
    const response = await api.get<{ workspaces: Workspace[] }>('/workspaces');
    return response.data;
  },

  async getWorkspace(id: string): Promise<{ workspace: Workspace }> {
    const response = await api.get<{ workspace: Workspace }>(`/workspaces/${id}`);
    return response.data;
  },

  async createWorkspace(data: {
    name: string;
    description?: string;
  }): Promise<{ workspace: Workspace }> {
    const response = await api.post<{ workspace: Workspace }>('/workspaces', data);
    return response.data;
  },

  async updateWorkspace(
    id: string,
    data: Partial<Workspace>
  ): Promise<{ workspace: Workspace }> {
    const response = await api.put<{ workspace: Workspace }>(
      `/workspaces/${id}`,
      data
    );
    return response.data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  async addMember(
    workspaceId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER'
  ): Promise<any> {
    const response = await api.post(`/workspaces/${workspaceId}/members`, {
      userId,
      role,
    });
    return response.data;
  },

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER'
  ): Promise<any> {
    const response = await api.put(`/workspaces/${workspaceId}/members/${userId}`, {
      role,
    });
    return response.data;
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${userId}`);
  },

  async getWorkspaceMembers(workspaceId: string, query?: string): Promise<{ members: any[] }> {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    const response = await api.get(`/workspaces/${workspaceId}/members${params}`);
    return response.data;
  },

  async reorderWorkspaces(workspaces: { id: string; position: number }[]): Promise<void> {
    await api.put('/workspaces/reorder', { workspaces });
  },

  async getWorkspaceActivities(
    workspaceId: string,
    params?: { limit?: number; offset?: number; type?: string; boardId?: string }
  ): Promise<{ activities: any[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.boardId) searchParams.set('boardId', params.boardId);
    const qs = searchParams.toString();
    const response = await api.get(`/workspaces/${workspaceId}/activities${qs ? `?${qs}` : ''}`);
    return response.data;
  },
};
