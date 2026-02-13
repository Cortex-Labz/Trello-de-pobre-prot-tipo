import { prisma } from '../utils/prisma';

export interface CreateActivityData {
  boardId: string;
  cardId?: string;
  userId: string;
  actionType: 'CREATED' | 'UPDATED' | 'MOVED' | 'ARCHIVED' | 'DELETED' | 'COMMENTED' | 'ASSIGNED' | 'LABELED' | 'ATTACHED' | 'COVER_CHANGED' | 'DUE_DATE_CHANGED' | 'COMPLETION_TIME_SET';
  details?: any; // JSON object with action details
}

export const activityService = {
  // Criar uma nova atividade
  async createActivity(data: CreateActivityData) {
    return prisma.activity.create({
      data: {
        boardId: data.boardId,
        cardId: data.cardId,
        userId: data.userId,
        actionType: data.actionType,
        details: data.details ? JSON.stringify(data.details) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  },

  // Buscar atividades de um card
  async getCardActivities(cardId: string) {
    return prisma.activity.findMany({
      where: { cardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limitar a 50 atividades mais recentes
    });
  },

  // Buscar atividades de um board
  async getBoardActivities(boardId: string, limit: number = 50) {
    return prisma.activity.findMany({
      where: { boardId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        card: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  },

  // Helper para registrar atividade de criação de card
  async logCardCreated(boardId: string, cardId: string, userId: string, cardTitle: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'CREATED',
      details: { cardTitle },
    });
  },

  // Helper para registrar atividade de atualização de card
  async logCardUpdated(boardId: string, cardId: string, userId: string, changes: any) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'UPDATED',
      details: changes,
    });
  },

  // Helper para registrar movimentação de card
  async logCardMoved(boardId: string, cardId: string, userId: string, fromList: string, toList: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'MOVED',
      details: { fromList, toList },
    });
  },

  // Helper para registrar arquivamento
  async logCardArchived(boardId: string, cardId: string, userId: string, cardTitle: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'ARCHIVED',
      details: { cardTitle },
    });
  },

  // Helper para registrar comentário
  async logComment(boardId: string, cardId: string, userId: string, comment: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'COMMENTED',
      details: { comment: comment.substring(0, 100) }, // Limitar preview
    });
  },

  // Helper para registrar atribuição de membro
  async logMemberAssigned(boardId: string, cardId: string, userId: string, assignedUserId: string, assignedUserName: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'ASSIGNED',
      details: { assignedUserId, assignedUserName },
    });
  },

  // Helper para registrar adição de etiqueta
  async logLabelAdded(boardId: string, cardId: string, userId: string, labelName: string, labelColor: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'LABELED',
      details: { labelName, labelColor, action: 'added' },
    });
  },

  // Helper para registrar remoção de etiqueta
  async logLabelRemoved(boardId: string, cardId: string, userId: string, labelName: string, labelColor: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'LABELED',
      details: { labelName, labelColor, action: 'removed' },
    });
  },

  // Helper para registrar anexo
  async logAttachment(boardId: string, cardId: string, userId: string, fileName: string) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'ATTACHED',
      details: { fileName },
    });
  },

  // Helper para registrar mudança de capa
  async logCoverChanged(boardId: string, cardId: string, userId: string, action: 'set' | 'removed') {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'COVER_CHANGED',
      details: { action },
    });
  },

  // Helper para registrar mudança de data de vencimento
  async logDueDateChanged(boardId: string, cardId: string, userId: string, dueDate: string | null, action: 'set' | 'removed') {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'DUE_DATE_CHANGED',
      details: { dueDate, action },
    });
  },

  // Helper para registrar tempo de conclusão
  async logCompletionTimeSet(boardId: string, cardId: string, userId: string, completionTime: number | null) {
    return this.createActivity({
      boardId,
      cardId,
      userId,
      actionType: 'COMPLETION_TIME_SET',
      details: { completionTime },
    });
  },
};
