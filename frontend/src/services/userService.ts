import { api } from './api';
import { User } from '../types';

export const userService = {
  async searchUsers(query: string): Promise<{ users: User[] }> {
    const response = await api.get<{ users: User[] }>('/users/search', {
      params: { q: query },
    });
    return response.data;
  },
};
