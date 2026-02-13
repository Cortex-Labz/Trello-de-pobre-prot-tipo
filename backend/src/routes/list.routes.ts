import { Router } from 'express';
import { body } from 'express-validator';
import {
  createList,
  updateList,
  deleteList,
  archiveList,
  reorderLists,
} from '../controllers/list.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/lists
router.post(
  '/',
  [
    body('boardId').isUUID(),
    body('title').trim().notEmpty(),
    body('position').isInt({ min: 0 }),
  ],
  createList
);

// PUT /api/lists/:id
router.put('/:id', updateList);

// DELETE /api/lists/:id
router.delete('/:id', deleteList);

// POST /api/lists/:id/archive
router.post('/:id/archive', archiveList);

// PUT /api/lists/reorder
router.put('/reorder', reorderLists);

export default router;
