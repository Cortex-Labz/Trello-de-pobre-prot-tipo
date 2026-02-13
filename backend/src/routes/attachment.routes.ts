import { Router } from 'express';
import { body } from 'express-validator';
import {
  uploadAttachment,
  deleteAttachment,
  getAttachments,
} from '../controllers/attachment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/cards/:cardId/attachments
router.post(
  '/cards/:cardId/attachments',
  [
    body('name').trim().notEmpty(),
    body('url').trim().notEmpty(),
    body('fileSize').isInt({ min: 0 }),
    body('mimeType').trim().notEmpty(),
  ],
  uploadAttachment
);

// GET /api/cards/:cardId/attachments
router.get('/cards/:cardId/attachments', getAttachments);

// DELETE /api/attachments/:id
router.delete('/attachments/:id', deleteAttachment);

export default router;
