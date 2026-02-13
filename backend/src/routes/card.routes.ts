import { Router } from 'express';
import { body } from 'express-validator';
import {
  getCard,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  archiveCard,
  duplicateCard,
  addCardMember,
  removeCardMember,
  setCoverImage,
} from '../controllers/card.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/cards/:id
router.get('/:id', getCard);

// POST /api/cards
router.post(
  '/',
  [
    body('listId').isUUID(),
    body('title').trim().notEmpty(),
    body('description').optional().trim(),
    body('position').isInt({ min: 0 }),
  ],
  createCard
);

// PUT /api/cards/:id
router.put('/:id', updateCard);

// DELETE /api/cards/:id
router.delete('/:id', deleteCard);

// PUT /api/cards/:id/move
router.put(
  '/:id/move',
  [
    body('listId').isUUID(),
    body('position').isInt({ min: 0 }),
  ],
  moveCard
);

// POST /api/cards/:id/archive
router.post('/:id/archive', archiveCard);

// POST /api/cards/:id/duplicate
router.post('/:id/duplicate', duplicateCard);

// POST /api/cards/:id/members
router.post(
  '/:id/members',
  [body('userId').isUUID()],
  addCardMember
);

// DELETE /api/cards/:id/members/:userId
router.delete('/:id/members/:userId', removeCardMember);

// PUT /api/cards/:id/cover
router.put(
  '/:id/cover',
  [body('attachmentId').optional().isUUID()],
  setCoverImage
);

export default router;
