import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

// GET /api/users/search?q=query
export async function searchUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({ error: 'Query parameter "q" is required' });
      return;
    }

    const query = q.trim().toLowerCase();

    if (query.length < 2) {
      res.status(400).json({ error: 'Query must be at least 2 characters' });
      return;
    }

    // Search users by email or name (SQLite doesn't support case-insensitive search with Prisma)
    // We'll do a case-sensitive search first, then filter client-side if needed
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Filter users client-side with case-insensitive matching
    const users = allUsers
      .filter((user: { id: string; email: string; name: string }) =>
        user.email.toLowerCase().includes(query) ||
        user.name.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit results to 10 users

    // Filter out the current user from results
    const filteredUsers = users.filter((user: { id: string }) => user.id !== req.userId);

    res.json({ users: filteredUsers });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
}
