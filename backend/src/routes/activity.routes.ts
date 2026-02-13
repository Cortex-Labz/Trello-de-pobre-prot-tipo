import { Router } from 'express';
import { activityService } from '../services/activityService';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Buscar atividades de um card
router.get('/card/:cardId', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params;
    const activities = await activityService.getCardActivities(cardId);

    res.json(activities);
  } catch (error) {
    console.error('Get card activities error:', error);
    res.status(500).json({ error: 'Failed to fetch card activities' });
  }
});

// Buscar atividades de um board
router.get('/board/:boardId', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = await activityService.getBoardActivities(boardId, limit);

    res.json(activities);
  } catch (error) {
    console.error('Get board activities error:', error);
    res.status(500).json({ error: 'Failed to fetch board activities' });
  }
});

export default router;
