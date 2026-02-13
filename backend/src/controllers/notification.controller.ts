import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notificationService';

// GET /api/notifications
export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const notifications = await notificationService.getUserNotifications(
      req.userId!,
      limit
    );

    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const count = await notificationService.getUnreadCount(req.userId!);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}

// PUT /api/notifications/:id/read
export async function markAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const success = await notificationService.markAsRead(id, req.userId!);

    if (!success) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

// PUT /api/notifications/mark-all-read
export async function markAllAsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    await notificationService.markAllAsRead(req.userId!);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

// DELETE /api/notifications/:id
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const success = await notificationService.deleteNotification(id, req.userId!);

    if (!success) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}
