export interface NotificationData {
  id: string;
  userId: string;
  type: 'MENTION' | 'ASSIGNMENT' | 'COMMENT' | 'DUE_DATE' | 'CARD_MOVED';
  content: string;
  relatedCardId?: string;
  isRead: boolean;
  createdAt: string;
}
