import { Router } from 'express';
import { body } from 'express-validator';
import {
  inviteToWorkspace,
  inviteToBoard,
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
} from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/invitations - Get my pending invitations
router.get('/', getMyInvitations);

// POST /api/invitations/:token/accept - Accept an invitation
router.post('/:token/accept', acceptInvitation);

// POST /api/invitations/:token/decline - Decline an invitation
router.post('/:token/decline', declineInvitation);

// DELETE /api/invitations/:id - Cancel an invitation (by inviter)
router.delete('/:id', cancelInvitation);

// POST /api/workspaces/:id/invite - Invite someone to workspace
router.post(
  '/workspaces/:id/invite',
  [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['ADMIN', 'MEMBER']),
  ],
  inviteToWorkspace
);

// POST /api/boards/:id/invite - Invite someone to board
router.post(
  '/boards/:id/invite',
  [
    body('email').isEmail().normalizeEmail(),
    body('role').isIn(['ADMIN', 'MEMBER', 'OBSERVER']),
  ],
  inviteToBoard
);

export default router;
