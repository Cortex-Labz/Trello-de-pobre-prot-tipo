import { api } from './api';
import { NotificationData } from '../types/notification';

export const notificationService = {
  // Buscar notificações do usuário
  async getNotifications(limit: number = 20): Promise<NotificationData[]> {
    const response = await api.get(`/notifications?limit=${limit}`);
    return response.data.notifications;
  },

  // Buscar contagem de não lidas
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread-count');
    return response.data.count;
  },

  // Marcar notificação como lida
  async markAsRead(notificationId: string): Promise<void> {
    await api.put(`/notifications/${notificationId}/read`);
  },

  // Marcar todas como lidas
  async markAllAsRead(): Promise<void> {
    await api.put('/notifications/mark-all-read');
  },

  // Deletar notificação
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },
};
