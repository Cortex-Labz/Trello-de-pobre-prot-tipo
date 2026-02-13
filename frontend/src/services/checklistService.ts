import { api } from './api';
import { Checklist, ChecklistItem } from '../types';

export const checklistService = {
  async getChecklists(cardId: string): Promise<{ checklists: Checklist[] }> {
    const response = await api.get<{ checklists: Checklist[] }>(`/cards/${cardId}/checklists`);
    return response.data;
  },

  async createChecklist(cardId: string, title: string): Promise<{ checklist: Checklist }> {
    const response = await api.post<{ checklist: Checklist }>(`/cards/${cardId}/checklists`, {
      title,
    });
    return response.data;
  },

  async updateChecklist(checklistId: string, title: string): Promise<{ checklist: Checklist }> {
    const response = await api.put<{ checklist: Checklist }>(`/checklists/${checklistId}`, {
      title,
    });
    return response.data;
  },

  async deleteChecklist(checklistId: string): Promise<void> {
    await api.delete(`/checklists/${checklistId}`);
  },

  async createChecklistItem(checklistId: string, title: string): Promise<{ item: ChecklistItem }> {
    const response = await api.post<{ item: ChecklistItem }>(`/checklists/${checklistId}/items`, {
      title,
    });
    return response.data;
  },

  async updateChecklistItem(
    itemId: string,
    data: { title?: string; isCompleted?: boolean }
  ): Promise<{ item: ChecklistItem }> {
    const response = await api.put<{ item: ChecklistItem }>(`/checklist-items/${itemId}`, data);
    return response.data;
  },

  async deleteChecklistItem(itemId: string): Promise<void> {
    await api.delete(`/checklist-items/${itemId}`);
  },
};
