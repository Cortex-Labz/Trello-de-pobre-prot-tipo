import { Router } from 'express';
import { body } from 'express-validator';
import {
  getBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  archiveBoard,
  duplicateBoard,
  addBoardMember,
  removeBoardMember,
  updateBoardMemberRole,
  getArchivedItems,
} from '../controllers/board.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/boards
router.get('/', getBoards);

// GET /api/boards/:id
router.get('/:id', getBoard);

// GET /api/boards/:id/archived
router.get('/:id/archived', getArchivedItems);

// POST /api/boards
router.post(
  '/',
  [
    body('workspaceId').isUUID(),
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('backgroundColor').optional().isString(),
    body('backgroundImageUrl').optional().isURL(),
    body('visibility').optional().isIn(['PRIVATE', 'WORKSPACE', 'PUBLIC']),
  ],
  createBoard
);

// PUT /api/boards/:id
router.put('/:id', updateBoard);

// DELETE /api/boards/:id
router.delete('/:id', deleteBoard);

// POST /api/boards/:id/archive
router.post('/:id/archive', archiveBoard);

// POST /api/boards/:id/duplicate
router.post('/:id/duplicate', duplicateBoard);

// POST /api/boards/:id/members
router.post(
  '/:id/members',
  [
    body('userId').isUUID(),
    body('role').isIn(['ADMIN', 'MEMBER', 'OBSERVER']),
  ],
  addBoardMember
);

// PUT /api/boards/:id/members/:userId
router.put(
  '/:id/members/:userId',
  [body('role').isIn(['ADMIN', 'MEMBER', 'OBSERVER'])],
  updateBoardMemberRole
);

// DELETE /api/boards/:id/members/:userId
router.delete('/:id/members/:userId', removeBoardMember);

export default router;
