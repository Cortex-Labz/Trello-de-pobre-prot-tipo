import { Router } from 'express';
import { body } from 'express-validator';
import {
  getBoardLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  addLabelToCard,
  removeLabelFromCard,
} from '../controllers/label.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/labels/board/:boardId
router.get('/board/:boardId', getBoardLabels);

// POST /api/labels
router.post(
  '/',
  [
    body('boardId').isUUID(),
    body('name').trim().notEmpty(),
    body('color').isHexColor(),
  ],
  createLabel
);

// PUT /api/labels/:id
router.put('/:id', updateLabel);

// DELETE /api/labels/:id
router.delete('/:id', deleteLabel);

// POST /api/labels/:labelId/cards/:cardId
router.post('/:labelId/cards/:cardId', addLabelToCard);

// DELETE /api/labels/:labelId/cards/:cardId
router.delete('/:labelId/cards/:cardId', removeLabelFromCard);

export default router;
