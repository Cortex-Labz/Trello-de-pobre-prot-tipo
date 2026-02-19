import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getIO } from '../utils/socket';
import { emitBoardUpdate } from '../services/websocket.service';
import { activityService } from '../services/activityService';

// GET /api/labels/board/:boardId
export async function getBoardLabels(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { boardId } = req.params;

    // Check board access
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        members: {
          some: {
            userId: req.userId,
          },
        },
      },
    });

    if (!board) {
      res.status(404).json({ error: 'Board not found or insufficient permissions' });
      return;
    }

    const labels = await prisma.label.findMany({
      where: {
        boardId,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ labels });
  } catch (error) {
    console.error('Get board labels error:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
}

// POST /api/labels
export async function createLabel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { boardId, name, color } = req.body;

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

    const label = await prisma.label.create({
      data: {
        boardId,
        name,
        color,
      },
    });

    emitBoardUpdate(getIO(), boardId, 'label:created', label);

    res.status(201).json({ label });
  } catch (error) {
    console.error('Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
}

// PUT /api/labels/:id
export async function updateLabel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const label = await prisma.label.findFirst({
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

    if (!label) {
      res.status(404).json({ error: 'Label not found or insufficient permissions' });
      return;
    }

    const updatedLabel = await prisma.label.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
      },
    });

    emitBoardUpdate(getIO(), label.board.id, 'label:updated', updatedLabel);

    res.json({ label: updatedLabel });
  } catch (error) {
    console.error('Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
}

// DELETE /api/labels/:id
export async function deleteLabel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const label = await prisma.label.findFirst({
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

    if (!label) {
      res.status(404).json({ error: 'Label not found or insufficient permissions' });
      return;
    }

    await prisma.label.delete({
      where: { id },
    });

    emitBoardUpdate(getIO(), label.board.id, 'label:deleted', { id });

    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    console.error('Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
}

// POST /api/labels/:labelId/cards/:cardId
export async function addLabelToCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { labelId, cardId } = req.params;

    // Check permissions
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            members: {
              some: {
                userId: req.userId,
              },
            },
          },
        },
      },
      include: {
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found or insufficient permissions' });
      return;
    }

    await prisma.cardLabel.create({
      data: {
        cardId,
        labelId,
      },
    });

    const label = await prisma.label.findUnique({
      where: { id: labelId },
    });

    // Log activity
    if (label) {
      await activityService.logLabelAdded(
        card.list.boardId,
        cardId,
        req.userId!,
        label.name,
        label.color
      );
    }

    emitBoardUpdate(getIO(), card.list.boardId, 'card:label:added', {
      cardId,
      label,
    });

    res.status(201).json({ message: 'Label added to card' });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Label already added to this card' });
      return;
    }
    console.error('Add label to card error:', error);
    res.status(500).json({ error: 'Failed to add label to card' });
  }
}

// DELETE /api/labels/:labelId/cards/:cardId
export async function removeLabelFromCard(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { labelId, cardId } = req.params;

    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        list: {
          board: {
            members: {
              some: {
                userId: req.userId,
              },
            },
          },
        },
      },
      include: {
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found or insufficient permissions' });
      return;
    }

    // Get label before deleting
    const label = await prisma.label.findUnique({
      where: { id: labelId },
    });

    await prisma.cardLabel.delete({
      where: {
        cardId_labelId: {
          cardId,
          labelId,
        },
      },
    });

    // Log activity
    if (label) {
      await activityService.logLabelRemoved(
        card.list.boardId,
        cardId,
        req.userId!,
        label.name,
        label.color
      );
    }

    emitBoardUpdate(getIO(), card.list.boardId, 'card:label:removed', {
      cardId,
      labelId,
    });

    res.json({ message: 'Label removed from card' });
  } catch (error) {
    console.error('Remove label from card error:', error);
    res.status(500).json({ error: 'Failed to remove label from card' });
  }
}
