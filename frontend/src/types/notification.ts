export interface NotificationData {
  id: string;
  userId: string;
  type: 'MENTION' | 'ASSIGNMENT' | 'COMMENT' | 'DUE_DATE' | 'CARD_MOVED' | 'CARD_CREATED' | 'CARD_DELETED';
  content: string;
  relatedCardId?: string;
  isRead: boolean;
  createdAt: string;
}
