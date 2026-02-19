import { prisma } from '../utils/prisma';
import { getIO } from '../utils/socket';

export const notificationService = {
  // Criar notificação de menção
  async createMentionNotification(
    mentionedUserId: string,
    mentioningUserId: string,
    cardId: string,
    _commentContent: string
  ) {
    try {
      // Não notificar se o usuário mencionou a si mesmo
      if (mentionedUserId === mentioningUserId) {
        return null;
      }

      // Buscar informações do usuário que mencionou e do card
      const [mentioningUser, card] = await Promise.all([
        prisma.user.findUnique({
          where: { id: mentioningUserId },
          select: { name: true },
        }),
        prisma.card.findUnique({
          where: { id: cardId },
          select: { title: true },
        }),
      ]);

      if (!mentioningUser || !card) {
        return null;
      }

      // Criar notificação
      const notification = await prisma.notification.create({
        data: {
          userId: mentionedUserId,
          type: 'MENTION',
          content: `${mentioningUser.name} mencionou você em "${card.title}"`,
          relatedCardId: cardId,
          isRead: false,
        },
      });

      // Emitir evento WebSocket
      getIO().to(`user:${mentionedUserId}`).emit('notification', notification);

      return notification;
    } catch (error) {
      console.error('Error creating mention notification:', error);
      return null;
    }
  },

  // Criar notificação de atribuição
  async createAssignmentNotification(
    assignedUserId: string,
    assigningUserId: string,
    cardId: string,
    cardTitle: string
  ) {
    try {
      // Não notificar se o usuário se atribuiu
      if (assignedUserId === assigningUserId) {
        return null;
      }

      const assigningUser = await prisma.user.findUnique({
        where: { id: assigningUserId },
        select: { name: true },
      });

      if (!assigningUser) {
        return null;
      }

      const notification = await prisma.notification.create({
        data: {
          userId: assignedUserId,
          type: 'ASSIGNMENT',
          content: `${assigningUser.name} atribuiu você ao card "${cardTitle}"`,
          relatedCardId: cardId,
          isRead: false,
        },
      });

      // Emitir evento WebSocket
      getIO().to(`user:${assignedUserId}`).emit('notification', notification);

      return notification;
    } catch (error) {
      console.error('Error creating assignment notification:', error);
      return null;
    }
  },

  // Criar notificação de comentário (para membros do card)
  async createCommentNotification(
    cardId: string,
    commentingUserId: string,
    cardTitle: string,
    _commentContent: string
  ) {
    try {
      // Buscar membros do card
      const cardMembers = await prisma.cardMember.findMany({
        where: { cardId },
        select: { userId: true },
      });

      const commentingUser = await prisma.user.findUnique({
        where: { id: commentingUserId },
        select: { name: true },
      });

      if (!commentingUser) {
        return [];
      }

      const notifications = [];

      // Criar notificação para cada membro (exceto quem comentou)
      for (const member of cardMembers) {
        if (member.userId !== commentingUserId) {
          const notification = await prisma.notification.create({
            data: {
              userId: member.userId,
              type: 'COMMENT',
              content: `${commentingUser.name} comentou em "${cardTitle}"`,
              relatedCardId: cardId,
              isRead: false,
            },
          });

          notifications.push(notification);

          // Emitir evento WebSocket
          getIO().to(`user:${member.userId}`).emit('notification', notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating comment notifications:', error);
      return [];
    }
  },

  // Criar notificação de data de vencimento próxima
  async createDueDateNotification(
    userId: string,
    cardId: string,
    cardTitle: string,
    _dueDate: Date
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: 'DUE_DATE',
          content: `O card "${cardTitle}" vence em breve`,
          relatedCardId: cardId,
          isRead: false,
        },
      });

      // Emitir evento WebSocket
      getIO().to(`user:${userId}`).emit('notification', notification);

      return notification;
    } catch (error) {
      console.error('Error creating due date notification:', error);
      return null;
    }
  },

  // Criar notificação de criação de card (para membros do board)
  async createCardCreatedNotification(
    boardId: string,
    cardId: string,
    creatorUserId: string,
    cardTitle: string,
    listName: string
  ) {
    try {
      // Buscar membros do board
      const boardMembers = await prisma.boardMember.findMany({
        where: { boardId },
        select: { userId: true },
      });

      const creatorUser = await prisma.user.findUnique({
        where: { id: creatorUserId },
        select: { name: true },
      });

      if (!creatorUser) {
        return [];
      }

      const notifications = [];

      // Criar notificação para cada membro (exceto quem criou)
      for (const member of boardMembers) {
        if (member.userId !== creatorUserId) {
          const notification = await prisma.notification.create({
            data: {
              userId: member.userId,
              type: 'CARD_CREATED',
              content: `${creatorUser.name} criou o card "${cardTitle}" em ${listName}`,
              relatedCardId: cardId,
              isRead: false,
            },
          });

          notifications.push(notification);

          // Emitir evento WebSocket
          getIO().to(`user:${member.userId}`).emit('notification', notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating card created notifications:', error);
      return [];
    }
  },

  // Criar notificação de movimentação de card (para membros do board)
  async createCardMovedNotification(
    boardId: string,
    cardId: string,
    movingUserId: string,
    cardTitle: string,
    fromList: string,
    toList: string
  ) {
    try {
      // Buscar membros do board (todos devem ser notificados)
      const boardMembers = await prisma.boardMember.findMany({
        where: { boardId },
        select: { userId: true },
      });

      const movingUser = await prisma.user.findUnique({
        where: { id: movingUserId },
        select: { name: true },
      });

      if (!movingUser) {
        return [];
      }

      const notifications = [];

      // Criar notificação para cada membro do board (exceto quem moveu)
      for (const member of boardMembers) {
        if (member.userId !== movingUserId) {
          const notification = await prisma.notification.create({
            data: {
              userId: member.userId,
              type: 'CARD_MOVED',
              content: `${movingUser.name} moveu "${cardTitle}" de "${fromList}" para "${toList}"`,
              relatedCardId: cardId,
              isRead: false,
            },
          });

          notifications.push(notification);

          // Emitir evento WebSocket
          getIO().to(`user:${member.userId}`).emit('notification', notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating card moved notifications:', error);
      return [];
    }
  },

  // Criar notificação de exclusão de card (para membros do board)
  async createCardDeletedNotification(
    boardId: string,
    _cardId: string,
    deletingUserId: string,
    cardTitle: string
  ) {
    try {
      // Buscar membros do board
      const boardMembers = await prisma.boardMember.findMany({
        where: { boardId },
        select: { userId: true },
      });

      const deletingUser = await prisma.user.findUnique({
        where: { id: deletingUserId },
        select: { name: true },
      });

      if (!deletingUser) {
        return [];
      }

      const notifications = [];

      // Criar notificação para cada membro (exceto quem excluiu)
      for (const member of boardMembers) {
        if (member.userId !== deletingUserId) {
          const notification = await prisma.notification.create({
            data: {
              userId: member.userId,
              type: 'CARD_DELETED',
              content: `${deletingUser.name} excluiu o card "${cardTitle}"`,
              isRead: false,
            },
          });

          notifications.push(notification);

          // Emitir evento WebSocket
          getIO().to(`user:${member.userId}`).emit('notification', notification);
        }
      }

      return notifications;
    } catch (error) {
      console.error('Error creating card deleted notifications:', error);
      return [];
    }
  },

  // Listar notificações de um usuário
  async getUserNotifications(userId: string, limit: number = 20) {
    try {
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      return [];
    }
  },

  // Marcar notificação como lida
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId, // Garantir que o usuário é dono da notificação
        },
        data: {
          isRead: true,
        },
      });

      return notification.count > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  // Marcar todas as notificações como lidas
  async markAllAsRead(userId: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  },

  // Contar notificações não lidas
  async getUnreadCount(userId: string) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      });

      return count;
    } catch (error) {
      console.error('Error counting unread notifications:', error);
      return 0;
    }
  },

  // Deletar notificação
  async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId, // Garantir que o usuário é dono da notificação
        },
      });

      return notification.count > 0;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  },
};
