import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';
import { emitBoardUpdate } from '../services/websocket.service';
import { activityService } from '../services/activityService';

// POST /api/lists
export async function createList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { boardId, title, position } = req.body;

    // Check board access
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
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

    const list = await prisma.list.create({
      data: {
        boardId,
        title,
        position,
      },
    });

    activityService.logListCreated(boardId, req.userId!, title).catch(console.error);

    emitBoardUpdate(io, boardId, 'list:created', list);

    res.status(201).json({ list });
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Failed to create list' });
  }
}

// PUT /api/lists/:id
export async function updateList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, position, backgroundColor } = req.body;

    // Check permissions
    const list = await prisma.list.findFirst({
      where: {
        id,
        board: {
          members: {
            some: {
              userId: req.userId,
              role: {
                in: ['ADMIN', 'MEMBER'],
              },
            },
          },
        },
      },
      include: {
        board: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!list) {
      res.status(404).json({ error: 'List not found or insufficient permissions' });
      return;
    }

    if (title && title !== list.title) {
      activityService.logListRenamed(list.board.id, req.userId!, list.title, title).catch(console.error);
    }

    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(position !== undefined && { position }),
        ...(backgroundColor !== undefined && { backgroundColor }),
      },
    });

    emitBoardUpdate(io, list.board.id, 'list:updated', updatedList);

    res.json({ list: updatedList });
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Failed to update list' });
  }
}

// DELETE /api/lists/:id
export async function deleteList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const list = await prisma.list.findFirst({
      where: {
        id,
        board: {
          members: {
            some: {
              userId: req.userId,
              role: {
                in: ['ADMIN', 'MEMBER'],
              },
            },
          },
        },
      },
      include: {
        board: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!list) {
      res.status(404).json({ error: 'List not found or insufficient permissions' });
      return;
    }

    activityService.logListDeleted(list.board.id, req.userId!, list.title).catch(console.error);

    await prisma.list.delete({
      where: { id },
    });

    emitBoardUpdate(io, list.board.id, 'list:deleted', { id });

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Failed to delete list' });
  }
}

// POST /api/lists/:id/archive
export async function archiveList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const list = await prisma.list.findFirst({
      where: {
        id,
        board: {
          members: {
            some: {
              userId: req.userId,
              role: {
                in: ['ADMIN', 'MEMBER'],
              },
            },
          },
        },
      },
      include: {
        board: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!list) {
      res.status(404).json({ error: 'List not found or insufficient permissions' });
      return;
    }

    const updatedList = await prisma.list.update({
      where: { id },
      data: {
        isArchived: !list.isArchived,
      },
    });

    emitBoardUpdate(io, list.board.id, 'list:archived', updatedList);

    res.json({ list: updatedList });
  } catch (error) {
    console.error('Archive list error:', error);
    res.status(500).json({ error: 'Failed to archive list' });
  }
}

// PUT /api/lists/reorder
export async function reorderLists(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { lists } = req.body; // Array of { id, position }

    if (!Array.isArray(lists)) {
      res.status(400).json({ error: 'Lists must be an array' });
      return;
    }

    // Update all list positions
    await prisma.$transaction(
      lists.map(({ id, position }) =>
        prisma.list.update({
          where: { id },
          data: { position },
        })
      )
    );

    res.json({ message: 'Lists reordered successfully' });
  } catch (error) {
    console.error('Reorder lists error:', error);
    res.status(500).json({ error: 'Failed to reorder lists' });
  }
}
