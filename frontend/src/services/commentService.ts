import { api } from './api';
import { Comment } from '../types';

export const commentService = {
  async getComments(cardId: string): Promise<{ comments: Comment[] }> {
    const response = await api.get<{ comments: Comment[] }>(`/cards/${cardId}/comments`);
    return response.data;
  },

  async createComment(cardId: string, content: string): Promise<{ comment: Comment }> {
    const response = await api.post<{ comment: Comment }>(`/cards/${cardId}/comments`, {
      content,
    });
    return response.data;
  },

  async updateComment(commentId: string, content: string): Promise<{ comment: Comment }> {
    const response = await api.put<{ comment: Comment }>(`/comments/${commentId}`, {
      content,
    });
    return response.data;
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },
};
