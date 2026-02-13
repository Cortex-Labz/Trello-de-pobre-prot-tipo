import { Router } from 'express';
import { body } from 'express-validator';
import {
  getChecklists,
  createChecklist,
  updateChecklist,
  deleteChecklist,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from '../controllers/checklist.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/cards/:cardId/checklists
router.get('/cards/:cardId/checklists', getChecklists);

// POST /api/cards/:cardId/checklists
router.post(
  '/cards/:cardId/checklists',
  [body('title').trim().notEmpty()],
  createChecklist
);

// PUT /api/checklists/:id
router.put(
  '/checklists/:id',
  [body('title').trim().notEmpty()],
  updateChecklist
);

// DELETE /api/checklists/:id
router.delete('/checklists/:id', deleteChecklist);

// POST /api/checklists/:checklistId/items
router.post(
  '/checklists/:checklistId/items',
  [body('title').trim().notEmpty()],
  createChecklistItem
);

// PUT /api/checklist-items/:id
router.put('/checklist-items/:id', updateChecklistItem);

// DELETE /api/checklist-items/:id
router.delete('/checklist-items/:id', deleteChecklistItem);

export default router;
