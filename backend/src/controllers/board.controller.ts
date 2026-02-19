import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';
import { emitBoardUpdate } from '../services/websocket.service';
import { activityService } from '../services/activityService';

// GET /api/boards
export async function getBoards(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { workspaceId } = req.query;

    const where: any = {
      OR: [
        {
          // Owner do workspace pode ver todos os boards
          workspace: {
            ownerId: req.userId,
          },
        },
        {
          // Membros ADMIN do workspace podem ver todos os boards
          workspace: {
            members: {
              some: {
                userId: req.userId,
                role: 'ADMIN',
              },
            },
          },
        },
        {
          // Membros MEMBER SÓ veem boards onde foram explicitamente adicionados
          members: {
            some: {
              userId: req.userId,
            },
          },
        },
      ],
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const boards = await prisma.board.findMany({
      where,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            lists: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({ boards });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

// GET /api/boards/:id
export async function getBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          {
            // Owner do workspace pode acessar todos os boards
            workspace: {
              ownerId: req.userId,
            },
          },
          {
            // Membros ADMIN do workspace podem acessar todos os boards
            workspace: {
              members: {
                some: {
                  userId: req.userId,
                  role: 'ADMIN',
                },
              },
            },
          },
          {
            // Membros MEMBER SÓ podem acessar boards onde foram explicitamente adicionados
            members: {
              some: {
                userId: req.userId,
              },
            },
          },
        ],
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        labels: true,
        lists: {
          where: {
            isArchived: false,
          },
          include: {
            cards: {
              where: {
                isArchived: false,
              },
              include: {
                labels: {
                  include: {
                    label: true,
                  },
                },
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
                checklists: {
                  include: {
                    items: true,
                  },
                },
                attachments: {
                  include: {
                    uploader: {
                      select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                      },
                    },
                  },
                  orderBy: {
                    uploadedAt: 'desc',
                  },
                },
              },
              orderBy: {
                position: 'asc',
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.json({ board });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
}

// POST /api/boards
export async function createBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const {
      workspaceId,
      name,
      description,
      backgroundColor,
      backgroundImageUrl,
      visibility = 'PRIVATE',
    } = req.body;

    // Check workspace access
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: req.userId },
          {
            members: {
              some: {
                userId: req.userId,
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

    const board = await prisma.board.create({
      data: {
        workspaceId,
        name,
        description,
        backgroundColor,
        backgroundImageUrl,
        visibility,
        members: {
          create: {
            userId: req.userId!,
            role: 'ADMIN',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ board });
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Failed to create board' });
  }
}

// PUT /api/boards/:id
export async function updateBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check permissions
    const board = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
            role: {
              in: ['ADMIN', 'MEMBER'],
            },
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: updates,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Emit WebSocket event
    emitBoardUpdate(io, id, 'board:updated', updatedBoard);

    res.json({ board: updatedBoard });
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Failed to update board' });
  }
}

// DELETE /api/boards/:id
export async function deleteBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if user is admin
    const board = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    await prisma.board.delete({
      where: { id },
    });

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Failed to delete board' });
  }
}

// POST /api/boards/:id/archive
export async function archiveBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const board = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: {
        isArchived: !board.isArchived,
      },
    });

    res.json({ board: updatedBoard });
  } catch (error) {
    console.error('Archive board error:', error);
    res.status(500).json({ error: 'Failed to archive board' });
  }
}

// POST /api/boards/:id/duplicate
export async function duplicateBoard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const originalBoard = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
          },
        },
      },
      include: {
        lists: {
          include: {
            cards: true,
          },
        },
        labels: true,
      },
    });

    if (!originalBoard) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    // Create duplicate board
    const newBoard = await prisma.board.create({
      data: {
        workspaceId: originalBoard.workspaceId,
        name: `${originalBoard.name} (Copy)`,
        description: originalBoard.description,
        backgroundColor: originalBoard.backgroundColor,
        backgroundImageUrl: originalBoard.backgroundImageUrl,
        visibility: originalBoard.visibility,
        members: {
          create: {
            userId: req.userId!,
            role: 'ADMIN',
          },
        },
      },
    });

    res.status(201).json({ board: newBoard });
  } catch (error) {
    console.error('Duplicate board error:', error);
    res.status(500).json({ error: 'Failed to duplicate board' });
  }
}

// POST /api/boards/:id/members
export async function addBoardMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { userId, role } = req.body;

    const board = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
            role: 'ADMIN',
          },
        },
      },
      select: {
        id: true,
        workspaceId: true,
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    // Verify target user is a workspace member
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: board.workspaceId,
        userId,
      },
    });

    // Also check if user is the workspace owner
    const workspace = await prisma.workspace.findFirst({
      where: {
        id: board.workspaceId,
        ownerId: userId,
      },
    });

    if (!workspaceMember && !workspace) {
      res.status(400).json({ error: 'User must be a workspace member before being added to a board' });
      return;
    }

    const member = await prisma.boardMember.create({
      data: {
        boardId: id,
        userId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    activityService.logBoardMemberAdded(id, req.userId!, member.user.name, role).catch(console.error);

    emitBoardUpdate(io, id, 'board:member:added', member);

    res.status(201).json({ member });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'User is already a member of this board' });
      return;
    }
    console.error('Add board member error:', error);
    res.status(500).json({ error: 'Failed to add board member' });
  }
}

// PUT /api/boards/:id/members/:userId
export async function updateBoardMemberRole(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id, userId } = req.params;
    const { role } = req.body;

    const board = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    const member = await prisma.boardMember.update({
      where: {
        boardId_userId: {
          boardId: id,
          userId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    emitBoardUpdate(io, id, 'board:member:updated', member);

    res.json({ member });
  } catch (error) {
    console.error('Update board member error:', error);
    res.status(500).json({ error: 'Failed to update board member' });
  }
}

// DELETE /api/boards/:id/members/:userId
export async function removeBoardMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id, userId } = req.params;

    const board = await prisma.board.findFirst({
      where: {
        id,
        members: {
          some: {
            userId: req.userId,
            role: 'ADMIN',
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    // Query the member's name before removal for activity logging
    const memberUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    activityService.logBoardMemberRemoved(id, req.userId!, memberUser?.name || 'Unknown').catch(console.error);

    await prisma.boardMember.delete({
      where: {
        boardId_userId: {
          boardId: id,
          userId,
        },
      },
    });

    emitBoardUpdate(io, id, 'board:member:removed', { userId });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove board member error:', error);
    res.status(500).json({ error: 'Failed to remove board member' });
  }
}

// GET /api/boards/:id/archived
export async function getArchivedItems(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Verify user has access to the board
    const board = await prisma.board.findFirst({
      where: {
        id,
        OR: [
          {
            // Owner do workspace pode acessar todos os boards
            workspace: {
              ownerId: req.userId,
            },
          },
          {
            // Membros ADMIN do workspace podem acessar todos os boards
            workspace: {
              members: {
                some: {
                  userId: req.userId,
                  role: 'ADMIN',
                },
              },
            },
          },
          {
            // Membros MEMBER SÓ podem acessar boards onde foram explicitamente adicionados
            members: {
              some: {
                userId: req.userId,
              },
            },
          },
        ],
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or access denied' });
      return;
    }

    // Get all archived lists and cards
    const archivedLists = await prisma.list.findMany({
      where: {
        boardId: id,
        isArchived: true,
      },
      include: {
        cards: {
          where: {
            isArchived: false,
          },
          include: {
            labels: {
              include: {
                label: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    const archivedCards = await prisma.card.findMany({
      where: {
        list: {
          boardId: id,
        },
        isArchived: true,
      },
      include: {
        list: {
          select: {
            id: true,
            title: true,
          },
        },
        labels: {
          include: {
            label: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        checklists: {
          include: {
            items: true,
          },
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            uploadedAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({
      lists: archivedLists,
      cards: archivedCards,
    });
  } catch (error) {
    console.error('Get archived items error:', error);
    res.status(500).json({ error: 'Failed to get archived items' });
  }
}
