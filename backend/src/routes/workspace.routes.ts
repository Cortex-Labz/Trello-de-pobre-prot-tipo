import { Router } from 'express';
import { body } from 'express-validator';
import {
  getWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  getWorkspaceActivities,
  addMember,
  updateMemberRole,
  removeMember,
  reorderWorkspaces,
} from '../controllers/workspace.controller';
import {
  getBoards,
  createBoard,
  deleteBoard,
} from '../controllers/board.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/workspaces
router.get('/', getWorkspaces);

// PUT /api/workspaces/reorder
router.put('/reorder', reorderWorkspaces);

// GET /api/workspaces/:id
router.get('/:id', getWorkspace);

// POST /api/workspaces
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
  ],
  createWorkspace
);

// PUT /api/workspaces/:id
router.put(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
  ],
  updateWorkspace
);

// DELETE /api/workspaces/:id
router.delete('/:id', deleteWorkspace);

// GET /api/workspaces/:id/activities
router.get('/:id/activities', getWorkspaceActivities);

// GET /api/workspaces/:id/members
router.get('/:id/members', getWorkspaceMembers);

// POST /api/workspaces/:id/members
router.post(
  '/:id/members',
  [
    body('userId').isUUID(),
    body('role').isIn(['ADMIN', 'MEMBER']),
  ],
  addMember
);

// PUT /api/workspaces/:id/members/:userId
router.put(
  '/:id/members/:userId',
  [
    body('role').isIn(['ADMIN', 'MEMBER']),
  ],
  updateMemberRole
);

// DELETE /api/workspaces/:id/members/:userId
router.delete('/:id/members/:userId', removeMember);

// Board routes within workspace
// GET /api/workspaces/:id/boards
router.get('/:id/boards', (req, res) => {
  req.query.workspaceId = req.params.id;
  return getBoards(req as any, res);
});

// POST /api/workspaces/:id/boards
router.post(
  '/:id/boards',
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
  ],
  (req: any, res: any) => {
    req.body.workspaceId = req.params.id;
    return createBoard(req, res);
  }
);

// DELETE /api/workspaces/:workspaceId/boards/:boardId
router.delete('/:workspaceId/boards/:boardId', (req: any, res: any) => {
  (req.params as any).id = req.params.boardId;
  return deleteBoard(req as any, res);
});

export default router;
