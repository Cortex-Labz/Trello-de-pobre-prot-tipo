import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';
import { emitBoardUpdate } from '../services/websocket.service';
import { activityService } from '../services/activityService';

// GET /api/cards/:id
export async function getCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const card = await prisma.card.findFirst({
      where: {
        id,
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
            id: true,
            title: true,
            boardId: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
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
        labels: {
          include: {
            label: true,
          },
        },
        checklists: {
          include: {
            items: {
              orderBy: {
                position: 'asc',
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    res.json({ card });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
}

// POST /api/cards
export async function createCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { listId, title, description, position } = req.body;

    // Check list access
    const list = await prisma.list.findFirst({
      where: {
        id: listId,
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
      select: {
        id: true,
        boardId: true,
      },
    });

    if (!list) {
      res.status(404).json({ error: 'List not found or insufficient permissions' });
      return;
    }

    const card = await prisma.card.create({
      data: {
        listId,
        title,
        description,
        position,
        createdBy: req.userId!,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Log activity
    await activityService.logCardCreated(
      list.boardId,
      card.id,
      req.userId!,
      card.title
    );

    emitBoardUpdate(io, list.boardId, 'card:created', {
      ...card,
      listId,
    });

    res.status(201).json({ card });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
}

// PUT /api/cards/:id
export async function updateCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    const card = await prisma.card.findFirst({
      where: {
        id,
        list: {
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

    const updatedCard = await prisma.card.update({
      where: { id },
      data: updates,
    });

    // Log specific activity types based on what was updated
    if (updates.dueDate !== undefined) {
      await activityService.logDueDateChanged(
        card.list.boardId,
        id,
        req.userId!,
        updates.dueDate,
        updates.dueDate ? 'set' : 'removed'
      );
    }
    if (updates.completionTime !== undefined) {
      await activityService.logCompletionTimeSet(
        card.list.boardId,
        id,
        req.userId!,
        updates.completionTime
      );
    }
    // Log general update if other fields changed
    const otherUpdates = Object.keys(updates).filter(
      key => !['dueDate', 'completionTime'].includes(key)
    );
    if (otherUpdates.length > 0) {
      const changes: any = {};
      otherUpdates.forEach(key => {
        changes[key] = { from: (card as any)[key], to: updates[key] };
      });
      await activityService.logCardUpdated(
        card.list.boardId,
        id,
        req.userId!,
        changes
      );
    }

    emitBoardUpdate(io, card.list.boardId, 'card:updated', updatedCard);

    res.json({ card: updatedCard });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
}

// DELETE /api/cards/:id
export async function deleteCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const card = await prisma.card.findFirst({
      where: {
        id,
        list: {
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

    await prisma.card.delete({
      where: { id },
    });

    emitBoardUpdate(io, card.list.boardId, 'card:deleted', { id });

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
}

// PUT /api/cards/:id/move
export async function moveCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { listId, position } = req.body;

    const card = await prisma.card.findFirst({
      where: {
        id,
        list: {
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

    // Get list names for activity log
    const [fromList, toList] = await Promise.all([
      prisma.list.findUnique({
        where: { id: card.listId },
        select: { title: true },
      }),
      prisma.list.findUnique({
        where: { id: listId },
        select: { title: true },
      }),
    ]);

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        listId,
        position,
      },
    });

    // Log activity if card moved to different list
    if (card.listId !== listId && fromList && toList) {
      await activityService.logCardMoved(
        card.list.boardId,
        id,
        req.userId!,
        fromList.title,
        toList.title
      );
    }

    emitBoardUpdate(io, card.list.boardId, 'card:moved', updatedCard);

    res.json({ card: updatedCard });
  } catch (error) {
    console.error('Move card error:', error);
    res.status(500).json({ error: 'Failed to move card' });
  }
}

// POST /api/cards/:id/archive
export async function archiveCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const card = await prisma.card.findFirst({
      where: {
        id,
        list: {
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

    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        isArchived: !card.isArchived,
      },
    });

    // Log activity only if archiving (not unarchiving)
    if (!card.isArchived) {
      await activityService.logCardArchived(
        card.list.boardId,
        id,
        req.userId!,
        card.title
      );
    }

    emitBoardUpdate(io, card.list.boardId, 'card:archived', updatedCard);

    res.json({ card: updatedCard });
  } catch (error) {
    console.error('Archive card error:', error);
    res.status(500).json({ error: 'Failed to archive card' });
  }
}

// POST /api/cards/:id/duplicate
export async function duplicateCard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const originalCard = await prisma.card.findFirst({
      where: {
        id,
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
        checklists: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!originalCard) {
      res.status(404).json({ error: 'Card not found' });
      return;
    }

    const newCard = await prisma.card.create({
      data: {
        listId: originalCard.listId,
        title: `${originalCard.title} (Copy)`,
        description: originalCard.description,
        position: originalCard.position + 1,
        createdBy: req.userId!,
      },
    });

    emitBoardUpdate(io, originalCard.list.boardId, 'card:created', newCard);

    res.status(201).json({ card: newCard });
  } catch (error) {
    console.error('Duplicate card error:', error);
    res.status(500).json({ error: 'Failed to duplicate card' });
  }
}

// POST /api/cards/:id/members
export async function addCardMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { userId } = req.body;

    const card = await prisma.card.findFirst({
      where: {
        id,
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

    const member = await prisma.cardMember.create({
      data: {
        cardId: id,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Log activity
    await activityService.logMemberAssigned(
      card.list.boardId,
      id,
      req.userId!,
      userId,
      member.user.name
    );

    emitBoardUpdate(io, card.list.boardId, 'card:member:added', {
      cardId: id,
      member,
    });

    res.status(201).json({ member });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'User is already assigned to this card' });
      return;
    }
    console.error('Add card member error:', error);
    res.status(500).json({ error: 'Failed to add card member' });
  }
}

// DELETE /api/cards/:id/members/:userId
export async function removeCardMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id, userId } = req.params;

    const card = await prisma.card.findFirst({
      where: {
        id,
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

    await prisma.cardMember.delete({
      where: {
        cardId_userId: {
          cardId: id,
          userId,
        },
      },
    });

    emitBoardUpdate(io, card.list.boardId, 'card:member:removed', {
      cardId: id,
      userId,
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove card member error:', error);
    res.status(500).json({ error: 'Failed to remove card member' });
  }
}

// PUT /api/cards/:id/cover
export async function setCoverImage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { attachmentId } = req.body;

    // Verify card exists and user has access
    const card = await prisma.card.findFirst({
      where: {
        id,
        list: {
          board: {
            OR: [
              {
                workspace: {
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
              },
              {
                members: {
                  some: {
                    userId: req.userId,
                  },
                },
              },
            ],
          },
        },
      },
      include: {
        list: true,
      },
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    // If attachmentId is provided, verify it belongs to this card
    let coverUrl: string | null = null;
    if (attachmentId) {
      const attachment = await prisma.attachment.findFirst({
        where: {
          id: attachmentId,
          cardId: id,
        },
      });

      if (!attachment) {
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }

      coverUrl = attachment.url;
    }

    // Update card with cover
    const updatedCard = await prisma.card.update({
      where: { id },
      data: {
        coverAttachmentId: attachmentId || null,
        coverUrl: coverUrl,
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
        },
      },
    });

    // Log activity
    await activityService.logCoverChanged(
      card.list.boardId,
      id,
      req.userId!,
      attachmentId ? 'set' : 'removed'
    );

    // Emit WebSocket update
    emitBoardUpdate(io, card.list.boardId, 'card:updated', updatedCard);

    res.json(updatedCard);
  } catch (error) {
    console.error('Set cover image error:', error);
    res.status(500).json({ error: 'Failed to set cover image' });
  }
}
