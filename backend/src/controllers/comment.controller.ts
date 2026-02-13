import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { activityService } from '../services/activityService';
import { notificationService } from '../services/notificationService';

// GET /api/cards/:cardId/comments
export async function getComments(req: AuthRequest, res: Response): Promise<void> {
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

    const comments = await prisma.comment.findMany({
      where: {
        cardId,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
}

// POST /api/cards/:cardId/comments
export async function createComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { cardId } = req.params;
    const { content } = req.body;

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
      include: {
        list: {
          select: {
            boardId: true,
          },
        },
      },
    });

    if (!card) {
      res.status(404).json({ error: 'Card not found or access denied' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        cardId,
        userId: req.userId!,
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

    // Detectar e salvar menções (@usuario)
    const mentionRegex = /@(\w+)/g;
    const mentions = content.match(mentionRegex);

    if (mentions) {
      // Buscar usuários mencionados pelo nome
      const usernames = mentions.map(m => m.slice(1)); // Remove @
      const users = await prisma.user.findMany({
        where: {
          name: {
            in: usernames,
          },
        },
        select: {
          id: true,
        },
      });

      // Criar registros de menções e notificações
      if (users.length > 0) {
        // SQLite não suporta skipDuplicates, então vamos criar um por um
        for (const user of users) {
          try {
            await prisma.commentMention.create({
              data: {
                commentId: comment.id,
                mentionedUserId: user.id,
              },
            });

            // Criar notificação de menção
            await notificationService.createMentionNotification(
              user.id,
              req.userId!,
              cardId,
              content
            );
          } catch (error: any) {
            // Ignorar erro de duplicata (unique constraint)
            if (error.code !== 'P2002') {
              throw error;
            }
          }
        }
      }
    }

    // Criar notificações para membros do card (comentário)
    await notificationService.createCommentNotification(
      cardId,
      req.userId!,
      card.title,
      content
    );

    // Log activity
    await activityService.logComment(
      card.list.boardId,
      cardId,
      req.userId!,
      content
    );

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
}

// PUT /api/comments/:id
export async function updateComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { content } = req.body;

    // Verify user owns the comment
    const existingComment = await prisma.comment.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingComment) {
      res.status(404).json({ error: 'Comment not found or access denied' });
      return;
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content },
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

    res.json({ comment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
}

// DELETE /api/comments/:id
export async function deleteComment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Verify user owns the comment
    const existingComment = await prisma.comment.findFirst({
      where: {
        id,
        userId: req.userId,
      },
    });

    if (!existingComment) {
      res.status(404).json({ error: 'Comment not found or access denied' });
      return;
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
}
