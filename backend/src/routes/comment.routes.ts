import { Router } from 'express';
import { body } from 'express-validator';
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/cards/:cardId/comments
router.get('/cards/:cardId/comments', getComments);

// POST /api/cards/:cardId/comments
router.post(
  '/cards/:cardId/comments',
  [body('content').trim().notEmpty()],
  createComment
);

// PUT /api/comments/:id
router.put(
  '/comments/:id',
  [body('content').trim().notEmpty()],
  updateComment
);

// DELETE /api/comments/:id
router.delete('/comments/:id', deleteComment);

export default router;
