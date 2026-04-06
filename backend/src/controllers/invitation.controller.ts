import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import crypto from 'crypto';

// POST /api/workspaces/:id/invite
export async function inviteToWorkspace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { email, role } = req.body;

    // Check if requester is owner or admin
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        OR: [
          { ownerId: req.userId },
          {
            members: {
              some: {
                userId: req.userId,
                role: 'ADMIN',
              },
            },
          },
        ],
      },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found or insufficient permissions' });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: id,
        user: { email },
      },
    });

    if (existingMember) {
      res.status(409).json({ error: 'User is already a member of this workspace' });
      return;
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        workspaceId: id,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      res.status(409).json({ error: 'User already has a pending invitation' });
      return;
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        type: 'WORKSPACE',
        workspaceId: id,
        role,
        invitedBy: req.userId!,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ invitation });
  } catch (error) {
    console.error('Invite to workspace error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
}

// POST /api/boards/:id/invite
export async function inviteToBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { email, role } = req.body;

    // Check if requester has permission (must be board admin or workspace owner)
    const board = await prisma.board.findFirst({
      where: {
        id,
      },
      include: {
        workspace: true,
        members: {
          where: {
            userId: req.userId,
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const isWorkspaceOwner = board.workspace.ownerId === req.userId;
    const isBoardAdmin = board.members.some((m: { role: string }) => m.role === 'ADMIN');

    if (!isWorkspaceOwner && !isBoardAdmin) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Check if user is already a member
    const existingMember = await prisma.boardMember.findFirst({
      where: {
        boardId: id,
        user: { email },
      },
    });

    if (existingMember) {
      res.status(409).json({ error: 'User is already a member of this board' });
      return;
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        boardId: id,
        status: 'PENDING',
      },
    });

    if (existingInvitation) {
      res.status(409).json({ error: 'User already has a pending invitation' });
      return;
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        type: 'BOARD',
        boardId: id,
        role,
        invitedBy: req.userId!,
        expiresAt,
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ invitation });
  } catch (error) {
    console.error('Invite to board error:', error);
    res.status(500).json({ error: 'Failed to send invitation' });
  }
}

// GET /api/invitations
export async function getMyInvitations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        email: user.email,
        status: 'PENDING',
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        board: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}

// POST /api/invitations/:token/accept
export async function acceptInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: true,
        board: true,
      },
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'PENDING') {
      res.status(400).json({ error: 'Invitation already processed' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { token },
        data: { status: 'EXPIRED' },
      });
      res.status(400).json({ error: 'Invitation has expired' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: 'This invitation is for a different email address' });
      return;
    }

    // Accept invitation and add user to workspace/board
    if (invitation.type === 'WORKSPACE' && invitation.workspaceId) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: req.userId!,
          role: invitation.role,
        },
      });
    } else if (invitation.type === 'BOARD' && invitation.boardId) {
      await prisma.boardMember.create({
        data: {
          boardId: invitation.boardId,
          userId: req.userId!,
          role: invitation.role,
        },
      });
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { token },
      data: { status: 'ACCEPTED' },
    });

    res.json({
      message: 'Invitation accepted successfully',
      type: invitation.type,
      workspaceId: invitation.workspaceId,
      boardId: invitation.boardId,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'You are already a member' });
      return;
    }
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
}

// POST /api/invitations/:token/decline
export async function declineInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { token } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'PENDING') {
      res.status(400).json({ error: 'Invitation already processed' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user || user.email !== invitation.email) {
      res.status(403).json({ error: 'This invitation is for a different email address' });
      return;
    }

    // Mark invitation as declined
    await prisma.invitation.update({
      where: { token },
      data: { status: 'DECLINED' },
    });

    res.json({ message: 'Invitation declined successfully' });
  } catch (error) {
    console.error('Decline invitation error:', error);
    res.status(500).json({ error: 'Failed to decline invitation' });
  }
}

// DELETE /api/invitations/:id (for admins to cancel invitations)
export async function cancelInvitation(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const invitation = await prisma.invitation.findUnique({
      where: { id },
    });

    if (!invitation) {
      res.status(404).json({ error: 'Invitation not found' });
      return;
    }

    // Only the inviter can cancel
    if (invitation.invitedBy !== req.userId) {
      res.status(403).json({ error: 'Only the inviter can cancel this invitation' });
      return;
    }

    await prisma.invitation.delete({
      where: { id },
    });

    res.json({ message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
}
