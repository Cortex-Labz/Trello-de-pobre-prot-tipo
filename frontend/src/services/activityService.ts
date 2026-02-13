import { api } from './api';

export const activityService = {
  // Buscar atividades de um card
  async getCardActivities(cardId: string) {
    const response = await api.get(`/activities/card/${cardId}`);
    return response.data;
  },

  // Buscar atividades de um board
  async getBoardActivities(boardId: string, limit?: number) {
    const params = limit ? { limit } : {};
    const response = await api.get(`/activities/board/${boardId}`, { params });
    return response.data;
  },
};
