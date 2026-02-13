import { api } from './api';
import { Board } from '../types';

export const boardService = {
  async getBoards(workspaceId?: string): Promise<{ boards: Board[] }> {
    const url = workspaceId ? `/boards?workspaceId=${workspaceId}` : '/boards';
    const response = await api.get<{ boards: Board[] }>(url);
    return response.data;
  },

  async getBoard(id: string): Promise<{ board: Board }> {
    const response = await api.get<{ board: Board }>(`/boards/${id}`);
    return response.data;
  },

  async getArchivedItems(boardId: string): Promise<{ lists: any[]; cards: any[] }> {
    const response = await api.get<{ lists: any[]; cards: any[] }>(`/boards/${boardId}/archived`);
    return response.data;
  },

  async createBoard(data: {
    workspaceId: string;
    name: string;
    description?: string;
    backgroundColor?: string;
    backgroundImageUrl?: string;
    visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
  }): Promise<{ board: Board }> {
    const response = await api.post<{ board: Board }>('/boards', data);
    return response.data;
  },

  async updateBoard(
    id: string,
    data: Partial<Board>
  ): Promise<{ board: Board }> {
    const response = await api.put<{ board: Board }>(`/boards/${id}`, data);
    return response.data;
  },

  async deleteBoard(id: string): Promise<void> {
    await api.delete(`/boards/${id}`);
  },

  async archiveBoard(id: string): Promise<{ board: Board }> {
    const response = await api.post<{ board: Board }>(`/boards/${id}/archive`);
    return response.data;
  },

  async duplicateBoard(id: string): Promise<{ board: Board }> {
    const response = await api.post<{ board: Board }>(`/boards/${id}/duplicate`);
    return response.data;
  },

  async addMember(
    boardId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER' | 'OBSERVER'
  ): Promise<any> {
    const response = await api.post(`/boards/${boardId}/members`, {
      userId,
      role,
    });
    return response.data;
  },

  async updateMemberRole(
    boardId: string,
    userId: string,
    role: 'ADMIN' | 'MEMBER' | 'OBSERVER'
  ): Promise<any> {
    const response = await api.put(`/boards/${boardId}/members/${userId}`, {
      role,
    });
    return response.data;
  },

  async removeMember(boardId: string, userId: string): Promise<void> {
    await api.delete(`/boards/${boardId}/members/${userId}`);
  },
};
