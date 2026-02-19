import { api } from './api';
import { Card } from '../types';

export const cardService = {
  async setCover(cardId: string, attachmentId: string | null): Promise<Card> {
    const response = await api.put(`/cards/${cardId}/cover`, { attachmentId });
    return response.data;
  },

  async getCard(id: string): Promise<{ card: Card }> {
    const response = await api.get<{ card: Card }>(`/cards/${id}`);
    return response.data;
  },

  async createCard(data: {
    listId: string;
    title: string;
    description?: string;
    position: number;
  }): Promise<{ card: Card }> {
    const response = await api.post<{ card: Card }>('/cards', data);
    return response.data;
  },

  async updateCard(id: string, data: Partial<Card>): Promise<{ card: Card }> {
    const response = await api.put<{ card: Card }>(`/cards/${id}`, data);
    return response.data;
  },

  async deleteCard(id: string): Promise<void> {
    await api.delete(`/cards/${id}`);
  },

  async moveCard(
    id: string,
    data: { listId: string; position: number }
  ): Promise<{ card: Card }> {
    const response = await api.put<{ card: Card }>(`/cards/${id}/move`, data);
    return response.data;
  },

  async archiveCard(id: string): Promise<{ card: Card }> {
    const response = await api.post<{ card: Card }>(`/cards/${id}/archive`);
    return response.data;
  },

  async duplicateCard(id: string): Promise<{ card: Card }> {
    const response = await api.post<{ card: Card }>(`/cards/${id}/duplicate`);
    return response.data;
  },

  async addMember(cardId: string, userId: string): Promise<any> {
    const response = await api.post(`/cards/${cardId}/members`, { userId });
    return response.data;
  },

  async removeMember(cardId: string, userId: string): Promise<void> {
    await api.delete(`/cards/${cardId}/members/${userId}`);
  },

  async getMyCards(): Promise<{ cards: Card[]; total: number }> {
    const response = await api.get<{ cards: Card[]; total: number }>('/cards/my-cards');
    return response.data;
  },
};
