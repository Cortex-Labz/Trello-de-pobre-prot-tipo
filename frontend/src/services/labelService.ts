import { api } from './api';
import { Label } from '../types';

export const labelService = {
  async getBoardLabels(boardId: string): Promise<{ labels: Label[] }> {
    const response = await api.get<{ labels: Label[] }>(`/labels/board/${boardId}`);
    return response.data;
  },

  async createLabel(boardId: string, name: string, color: string): Promise<{ label: Label }> {
    const response = await api.post<{ label: Label }>(`/labels`, {
      boardId,
      name,
      color,
    });
    return response.data;
  },

  async updateLabel(labelId: string, name: string, color: string): Promise<{ label: Label }> {
    const response = await api.put<{ label: Label }>(`/labels/${labelId}`, {
      name,
      color,
    });
    return response.data;
  },

  async deleteLabel(labelId: string): Promise<void> {
    await api.delete(`/labels/${labelId}`);
  },

  async addLabelToCard(labelId: string, cardId: string): Promise<void> {
    await api.post(`/labels/${labelId}/cards/${cardId}`);
  },

  async removeLabelFromCard(labelId: string, cardId: string): Promise<void> {
    await api.delete(`/labels/${labelId}/cards/${cardId}`);
  },
};
