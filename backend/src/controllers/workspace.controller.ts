import { Response } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/workspaces
export async function getWorkspaces(req: AuthRequest, res: Response): Promise<void> {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
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
      include: {
        owner: {
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
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            boards: true,
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    res.json({ workspaces });
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
}

// GET /api/workspaces/:id
export async function getWorkspace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
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
      include: {
        owner: {
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
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        boards: {
          where: {
            isArchived: false,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
      },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace' });
  }
}

// POST /api/workspaces
export async function createWorkspace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, description } = req.body;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: req.userId!,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({ workspace });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
}

// PUT /api/workspaces/:id
export async function updateWorkspace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { name, description } = req.body;

    // Check if user is owner or admin
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

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json({ workspace: updatedWorkspace });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
}

// DELETE /api/workspaces/:id
export async function deleteWorkspace(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Only owner can delete workspace
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
        ownerId: req.userId,
      },
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found or insufficient permissions' });
      return;
    }

    await prisma.workspace.delete({
      where: { id },
    });

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
}

// POST /api/workspaces/:id/members
export async function addMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const { userId, role } = req.body;

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

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Add member
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId: id,
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

    res.status(201).json({ member });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'User is already a member of this workspace' });
      return;
    }
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
}

// PUT /api/workspaces/:id/members/:userId
export async function updateMemberRole(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'MEMBER'].includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be ADMIN or MEMBER' });
      return;
    }

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

    // Cannot change owner role
    if (workspace.ownerId === userId) {
      res.status(400).json({ error: 'Cannot change workspace owner role' });
      return;
    }

    // Update member role
    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId,
        },
      },
      data: {
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

    res.json({ member });
  } catch (error: any) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
}

// DELETE /api/workspaces/:id/members/:userId
export async function removeMember(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id, userId } = req.params;

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

    // Cannot remove owner
    if (workspace.ownerId === userId) {
      res.status(400).json({ error: 'Cannot remove workspace owner' });
      return;
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId,
        },
      },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
}

// GET /api/workspaces/:id/members?q=searchTerm
export async function getWorkspaceMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const q = req.query.q as string | undefined;

    // Verify requester has access to the workspace (is owner or member)
    const workspace = await prisma.workspace.findFirst({
      where: {
        id,
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
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Fetch owner details
    const owner = await prisma.user.findUnique({
      where: { id: workspace.ownerId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
    });

    // Fetch all workspace members (excluding the requester)
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: id,
        userId: { not: req.userId },
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

    // Build the members list
    const members: Array<{ id: string; name: string; email: string; avatarUrl: string | null }> = [];

    // Add owner if not the requester
    if (owner && workspace.ownerId !== req.userId) {
      members.push(owner);
    }

    // Add workspace members
    for (const m of workspaceMembers) {
      members.push(m.user);
    }

    // Filter by search query (case-insensitive) in JavaScript since SQLite doesn't support mode: 'insensitive'
    const filtered = q
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(q.toLowerCase()) ||
            m.email.toLowerCase().includes(q.toLowerCase())
        )
      : members;

    res.json({ members: filtered });
  } catch (error) {
    console.error('Get workspace members error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace members' });
  }
}

// GET /api/workspaces/:id/activities?limit=50&offset=0&type=&boardId=
export async function getWorkspaceActivities(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const typeFilter = req.query.type as string | undefined;
    const boardFilter = req.query.boardId as string | undefined;

    // Check if user is owner or admin of workspace
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
      include: {
        boards: {
          select: { id: true },
        },
      },
    });

    if (!workspace) {
      res.status(403).json({ error: 'Only workspace admins can view activity log' });
      return;
    }

    const boardIds = workspace.boards.map(b => b.id);

    if (boardIds.length === 0) {
      res.json({ activities: [], total: 0 });
      return;
    }

    const where: any = {
      boardId: { in: boardFilter ? [boardFilter] : boardIds },
    };

    if (typeFilter) {
      where.actionType = typeFilter;
    }

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          board: {
            select: {
              id: true,
              name: true,
            },
          },
          card: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({ activities, total });
  } catch (error) {
    console.error('Get workspace activities error:', error);
    res.status(500).json({ error: 'Failed to fetch workspace activities' });
  }
}

// PUT /api/workspaces/reorder
export async function reorderWorkspaces(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { workspaces } = req.body;

    if (!Array.isArray(workspaces)) {
      res.status(400).json({ error: 'workspaces must be an array' });
      return;
    }

    // Update position for each workspace
    // Only update workspaces that the user owns or is a member of
    const updatePromises = workspaces.map(async ({ id, position }: { id: string; position: number }) => {
      // Check if user has access to this workspace
      const workspace = await prisma.workspace.findFirst({
        where: {
          id,
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
        return null; // Skip workspaces user doesn't have access to
      }

      return prisma.workspace.update({
        where: { id },
        data: { position },
      });
    });

    await Promise.all(updatePromises);

    res.json({ message: 'Workspaces reordered successfully' });
  } catch (error) {
    console.error('Reorder workspaces error:', error);
    res.status(500).json({ error: 'Failed to reorder workspaces' });
  }
}
