import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { getIO } from '../utils/socket';
import { emitBoardUpdate } from '../services/websocket.service';
import { activityService } from '../services/activityService';

// POST /api/cards/:cardId/attachments
export async function uploadAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { cardId } = req.params;
    const { name, url, fileSize, mimeType } = req.body;

    console.log('Upload attachment request:', { cardId, name, fileSize, mimeType, userId: req.userId });

    // Verify card exists and user has access
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
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
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      res.status(404).json({ message: 'Card not found or access denied' });
      return;
    }

    const attachment = await prisma.attachment.create({
      data: {
        cardId,
        name,
        url,
        fileSize,
        mimeType,
        uploadedBy: req.userId!,
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Log activity
    await activityService.logAttachment(
      card.list.boardId,
      cardId,
      req.userId!,
      name
    );

    // Emit WebSocket update
    emitBoardUpdate(getIO(), card.list.boardId, 'card:updated', {
      cardId: card.id,
      attachment,
    });

    res.status(201).json(attachment);
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ message: 'Failed to upload attachment' });
  }
}

// DELETE /api/attachments/:id
export async function deleteAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    console.log('Delete attachment request:', { id, userId: req.userId });

    // Find attachment and verify access
    const attachment = await prisma.attachment.findFirst({
      where: {
        id,
        card: {
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
      },
      include: {
        card: {
          include: {
            list: {
              select: {
                boardId: true,
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      console.log('Attachment not found or access denied:', { id, userId: req.userId });
      res.status(404).json({ message: 'Attachment not found or access denied' });
      return;
    }

    console.log('Deleting attachment:', { id, cardId: attachment.cardId });

    await prisma.attachment.delete({
      where: { id },
    });

    // Emit WebSocket update
    emitBoardUpdate(getIO(), attachment.card.list.boardId, 'card:updated', {
      cardId: attachment.cardId,
      deletedAttachmentId: id,
    });

    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
}

// GET /api/cards/:cardId/attachments
export async function getAttachments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { cardId } = req.params;

    // Verify card exists and user has access
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
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
    });

    if (!card) {
      res.status(404).json({ message: 'Card not found or access denied' });
      return;
    }

    const attachments = await prisma.attachment.findMany({
      where: { cardId },
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
    });

    res.status(200).json(attachments);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ message: 'Failed to fetch attachments' });
  }
}
