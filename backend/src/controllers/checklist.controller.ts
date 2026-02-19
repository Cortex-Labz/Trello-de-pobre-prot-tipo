import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { activityService } from '../services/activityService';

// GET /api/cards/:cardId/checklists
export async function getChecklists(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { cardId } = req.params;

    // Verify user has access to the card
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
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    const checklists = await prisma.checklist.findMany({
      where: {
        cardId,
      },
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
    });

    res.json({ checklists });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ error: 'Failed to fetch checklists' });
  }
}

// POST /api/cards/:cardId/checklists
export async function createChecklist(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { cardId } = req.params;
    const { title } = req.body;

    // Verify user has access to the card
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
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    // Get the max position for the new checklist
    const maxPosition = await prisma.checklist.aggregate({
      where: { cardId },
      _max: { position: true },
    });

    const checklist = await prisma.checklist.create({
      data: {
        title,
        cardId,
        position: (maxPosition._max.position ?? -1) + 1,
      },
      include: {
        items: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    // Log activity (fire-and-forget)
    const cardWithBoard = await prisma.card.findUnique({
      where: { id: cardId },
      select: { list: { select: { boardId: true } }, title: true },
    });
    if (cardWithBoard) {
      activityService.logCardUpdated(cardWithBoard.list.boardId, cardId, req.userId!, {
        action: 'checklist_created',
        checklistTitle: title,
        cardTitle: cardWithBoard.title,
      }).catch(console.error);
    }

    res.status(201).json({ checklist });
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({ error: 'Failed to create checklist' });
  }
}

// PUT /api/checklists/:id
export async function updateChecklist(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { title } = req.body;

    // Verify user has access to the checklist
    const existingChecklist = await prisma.checklist.findFirst({
      where: {
        id,
        card: {
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
      },
    });

    if (!existingChecklist) {
      res.status(404).json({ error: 'Checklist not found or access denied' });
      return;
    }

    const checklist = await prisma.checklist.update({
      where: { id },
      data: { title },
      include: {
        items: {
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    res.json({ checklist });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Failed to update checklist' });
  }
}

// DELETE /api/checklists/:id
export async function deleteChecklist(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Verify user has access to the checklist (include card/board info for activity log)
    const existingChecklist = await prisma.checklist.findFirst({
      where: {
        id,
        card: {
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
      },
      include: {
        card: {
          select: {
            id: true,
            list: { select: { boardId: true } },
          },
        },
      },
    });

    if (!existingChecklist) {
      res.status(404).json({ error: 'Checklist not found or access denied' });
      return;
    }

    // Log activity before deletion (fire-and-forget)
    const boardId = existingChecklist.card.list.boardId;
    const cardId = existingChecklist.card.id;
    activityService.logCardUpdated(boardId, cardId, req.userId!, {
      action: 'checklist_deleted',
      checklistTitle: existingChecklist.title,
    }).catch(console.error);

    // Delete all items first (cascade should handle this, but being explicit)
    await prisma.checklistItem.deleteMany({
      where: { checklistId: id },
    });

    await prisma.checklist.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ error: 'Failed to delete checklist' });
  }
}

// POST /api/checklists/:checklistId/items
export async function createChecklistItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { checklistId } = req.params;
    const { title } = req.body;

    // Verify user has access to the checklist
    const checklist = await prisma.checklist.findFirst({
      where: {
        id: checklistId,
        card: {
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
      },
    });

    if (!checklist) {
      res.status(404).json({ error: 'Checklist not found or access denied' });
      return;
    }

    // Get the max position for the new item
    const maxPosition = await prisma.checklistItem.aggregate({
      where: { checklistId },
      _max: { position: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        title,
        checklistId,
        position: (maxPosition._max.position ?? -1) + 1,
        isCompleted: false,
      },
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ error: 'Failed to create checklist item' });
  }
}

// PUT /api/checklist-items/:id
export async function updateChecklistItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { title, isCompleted } = req.body;

    // Verify user has access to the item (include card/board info for activity log)
    const existingItem = await prisma.checklistItem.findFirst({
      where: {
        id,
        checklist: {
          card: {
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
        },
      },
      include: {
        checklist: {
          select: {
            card: {
              select: {
                id: true,
                list: { select: { boardId: true } },
              },
            },
          },
        },
      },
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Checklist item not found or access denied' });
      return;
    }

    const item = await prisma.checklistItem.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(isCompleted !== undefined && { isCompleted }),
      },
    });

    // Log activity when isCompleted changes (fire-and-forget)
    if (isCompleted !== undefined && isCompleted !== existingItem.isCompleted) {
      const boardId = existingItem.checklist.card.list.boardId;
      const cardId = existingItem.checklist.card.id;
      activityService.logCardUpdated(boardId, cardId, req.userId!, {
        action: isCompleted ? 'checklist_item_completed' : 'checklist_item_uncompleted',
        itemTitle: existingItem.title,
      }).catch(console.error);
    }

    res.json({ item });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Failed to update checklist item' });
  }
}

// DELETE /api/checklist-items/:id
export async function deleteChecklistItem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Verify user has access to the item
    const existingItem = await prisma.checklistItem.findFirst({
      where: {
        id,
        checklist: {
          card: {
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
        },
      },
    });

    if (!existingItem) {
      res.status(404).json({ error: 'Checklist item not found or access denied' });
      return;
    }

    await prisma.checklistItem.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ error: 'Failed to delete checklist item' });
  }
}
