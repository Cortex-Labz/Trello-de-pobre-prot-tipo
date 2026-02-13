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

  async reorderWorkspaces(workspaces: { id: string; position: number }[]): Promise<void> {
    await api.put('/workspaces/reorder', { workspaces });
  },
};
