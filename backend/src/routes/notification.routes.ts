import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

// GET /api/notifications - Buscar notificações do usuário
router.get('/', authenticate, getNotifications);

// GET /api/notifications/unread-count - Buscar contagem de não lidas
router.get('/unread-count', authenticate, getUnreadCount);

// PUT /api/notifications/:id/read - Marcar notificação como lida
router.put('/:id/read', authenticate, markAsRead);

// PUT /api/notifications/mark-all-read - Marcar todas como lidas
router.put('/mark-all-read', authenticate, markAllAsRead);

// DELETE /api/notifications/:id - Deletar notificação
router.delete('/:id', authenticate, deleteNotification);

export default router;
