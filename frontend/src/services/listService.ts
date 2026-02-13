import { api } from './api';
import { List } from '../types';

export const listService = {
  async createList(data: {
    boardId: string;
    title: string;
    position: number;
  }): Promise<{ list: List }> {
    const response = await api.post<{ list: List }>('/lists', data);
    return response.data;
  },

  async updateList(id: string, data: { title?: string; position?: number; backgroundColor?: string }): Promise<{ list: List }> {
    const response = await api.put<{ list: List }>(`/lists/${id}`, data);
    return response.data;
  },

  async deleteList(id: string): Promise<void> {
    await api.delete(`/lists/${id}`);
  },

  async archiveList(id: string): Promise<{ list: List }> {
    const response = await api.post<{ list: List }>(`/lists/${id}/archive`);
    return response.data;
  },

  async reorderLists(lists: Array<{ id: string; position: number }>): Promise<void> {
    await api.put('/lists/reorder', { lists });
  },
};
