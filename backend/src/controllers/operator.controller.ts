import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';

function hasOwnProperty(body: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(body, key);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('Expected a string value');
  }

  return value;
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  return undefined;
}

function readDate(value: unknown): Date | null | undefined {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error('Expected an ISO date string');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid date value');
  }

  return parsed;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => {
      if (/password|token|api[-_]?key|authorization/i.test(key)) {
        return [key, '[REDACTED]'];
      }

      return [key, redact(entryValue)];
    });

    return Object.fromEntries(entries);
  }

  return value;
}

function logOperatorAction(req: Request, action: string, payload: unknown, result?: unknown): void {
  console.log(JSON.stringify({
    type: 'operator_action',
    timestamp: new Date().toISOString(),
    action,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent') ?? null,
    payload: redact(payload),
    result: redact(result),
  }));
}

function operatorError(res: Response, status: number, error: string): void {
  res.status(status).json({ error });
}

async function resolveUser(userId?: string, userEmail?: string) {
  if (userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  if (userEmail) {
    return prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });
  }

  return null;
}

async function resolveRequiredUser(body: Record<string, unknown>) {
  const userId = readString(body.userId) ?? readString(body.ownerUserId) ?? readString(body.createdByUserId);
  const userEmail = readString(body.userEmail) ?? readString(body.ownerEmail) ?? readString(body.createdByEmail);

  const user = await resolveUser(userId, userEmail);
  if (!user) {
    throw new Error('Referenced user was not found');
  }

  return user;
}

async function getNextListPosition(boardId: string): Promise<number> {
  const aggregate = await prisma.list.aggregate({
    where: { boardId },
    _max: { position: true },
  });

  return (aggregate._max.position ?? -1) + 1;
}

async function getNextCardPosition(listId: string): Promise<number> {
  const aggregate = await prisma.card.aggregate({
    where: { listId },
    _max: { position: true },
  });

  return (aggregate._max.position ?? -1) + 1;
}

export async function getOperatorHealth(_req: Request, res: Response): Promise<void> {
  res.json({
    status: 'ok',
    operator: true,
    timestamp: new Date().toISOString(),
  });
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const email = readString(req.query.email);
    const query = readString(req.query.q);
    const limit = Math.min(readNumber(req.query.limit) ?? 25, 100);

    const users = await prisma.user.findMany({
      where: {
        ...(email ? { email } : {}),
        ...(query
          ? {
              OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { name: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json({ users });
  } catch (error) {
    console.error('Operator list users error:', error);
    operatorError(res, 500, 'Failed to list users');
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const email = readString(body.email);
    const password = readString(body.password);
    const name = readString(body.name);

    if (!email || !password || !name) {
      operatorError(res, 400, 'email, password, and name are required');
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      operatorError(res, 409, 'User already exists');
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(password, 10),
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    logOperatorAction(req, 'user.create', body, { userId: user.id, email: user.email });
    res.status(201).json({ user });
  } catch (error) {
    console.error('Operator create user error:', error);
    operatorError(res, 500, 'Failed to create user');
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { id } = req.params;

    const updates: Record<string, unknown> = {};

    if (hasOwnProperty(body, 'email')) {
      const email = readString(body.email);
      if (!email) {
        operatorError(res, 400, 'email must be a non-empty string');
        return;
      }
      updates.email = email;
    }

    if (hasOwnProperty(body, 'name')) {
      const name = readString(body.name);
      if (!name) {
        operatorError(res, 400, 'name must be a non-empty string');
        return;
      }
      updates.name = name;
    }

    if (hasOwnProperty(body, 'avatarUrl')) {
      updates.avatarUrl = readOptionalString(body.avatarUrl);
    }

    if (hasOwnProperty(body, 'password')) {
      const password = readString(body.password);
      if (!password) {
        operatorError(res, 400, 'password must be a non-empty string');
        return;
      }
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      operatorError(res, 400, 'No valid user fields were provided');
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        updatedAt: true,
      },
    });

    logOperatorAction(req, 'user.update', body, { userId: user.id });
    res.json({ user });
  } catch (error) {
    console.error('Operator update user error:', error);
    operatorError(res, 500, 'Failed to update user');
  }
}

export async function listWorkspaces(req: Request, res: Response): Promise<void> {
  try {
    const ownerUserId = readString(req.query.ownerUserId);
    const ownerEmail = readString(req.query.ownerEmail);
    const owner = await resolveUser(ownerUserId, ownerEmail);

    if ((ownerUserId || ownerEmail) && !owner) {
      operatorError(res, 404, 'Owner not found');
      return;
    }

    const workspaces = await prisma.workspace.findMany({
      where: owner ? { ownerId: owner.id } : undefined,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            boards: true,
            members: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ workspaces });
  } catch (error) {
    console.error('Operator list workspaces error:', error);
    operatorError(res, 500, 'Failed to list workspaces');
  }
}

export async function createWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const name = readString(body.name);
    const description = readOptionalString(body.description);

    if (!name) {
      operatorError(res, 400, 'name is required');
      return;
    }

    const owner = await resolveRequiredUser(body);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        ownerId: owner.id,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logOperatorAction(req, 'workspace.create', body, { workspaceId: workspace.id });
    res.status(201).json({ workspace });
  } catch (error) {
    console.error('Operator create workspace error:', error);
    operatorError(res, 500, error instanceof Error ? error.message : 'Failed to create workspace');
  }
}

export async function updateWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    if (hasOwnProperty(body, 'name')) {
      const name = readString(body.name);
      if (!name) {
        operatorError(res, 400, 'name must be a non-empty string');
        return;
      }
      updates.name = name;
    }

    if (hasOwnProperty(body, 'description')) {
      updates.description = readOptionalString(body.description);
    }

    if (hasOwnProperty(body, 'ownerUserId') || hasOwnProperty(body, 'ownerEmail')) {
      const owner = await resolveRequiredUser(body);
      updates.ownerId = owner.id;
    }

    if (Object.keys(updates).length === 0) {
      operatorError(res, 400, 'No valid workspace fields were provided');
      return;
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: updates,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logOperatorAction(req, 'workspace.update', body, { workspaceId: workspace.id });
    res.json({ workspace });
  } catch (error) {
    console.error('Operator update workspace error:', error);
    operatorError(res, 500, error instanceof Error ? error.message : 'Failed to update workspace');
  }
}

export async function deleteWorkspace(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.workspace.delete({ where: { id } });
    logOperatorAction(req, 'workspace.delete', { id }, { workspaceId: id });
    res.json({ success: true, workspaceId: id });
  } catch (error) {
    console.error('Operator delete workspace error:', error);
    operatorError(res, 500, 'Failed to delete workspace');
  }
}

export async function listBoards(req: Request, res: Response): Promise<void> {
  try {
    const workspaceId = readString(req.query.workspaceId);

    const boards = await prisma.board.findMany({
      where: workspaceId ? { workspaceId } : undefined,
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
                email: true,
                name: true,
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
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ boards });
  } catch (error) {
    console.error('Operator list boards error:', error);
    operatorError(res, 500, 'Failed to list boards');
  }
}

export async function createBoard(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const workspaceId = readString(body.workspaceId);
    const name = readString(body.name);
    const description = readOptionalString(body.description);
    const backgroundColor = readOptionalString(body.backgroundColor);
    const backgroundImageUrl = readOptionalString(body.backgroundImageUrl);
    const visibility = readString(body.visibility) ?? 'PRIVATE';

    if (!workspaceId || !name) {
      operatorError(res, 400, 'workspaceId and name are required');
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!workspace) {
      operatorError(res, 404, 'Workspace not found');
      return;
    }

    const owner = hasOwnProperty(body, 'ownerUserId') || hasOwnProperty(body, 'ownerEmail')
      ? await resolveRequiredUser(body)
      : await prisma.user.findUnique({
          where: { id: workspace.ownerId },
          select: { id: true, email: true, name: true },
        });

    if (!owner) {
      operatorError(res, 404, 'Board owner was not found');
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
            userId: owner.id,
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
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    logOperatorAction(req, 'board.create', body, { boardId: board.id });
    res.status(201).json({ board });
  } catch (error) {
    console.error('Operator create board error:', error);
    operatorError(res, 500, error instanceof Error ? error.message : 'Failed to create board');
  }
}

export async function updateBoard(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    if (hasOwnProperty(body, 'name')) {
      const name = readString(body.name);
      if (!name) {
        operatorError(res, 400, 'name must be a non-empty string');
        return;
      }
      updates.name = name;
    }

    if (hasOwnProperty(body, 'description')) {
      updates.description = readOptionalString(body.description);
    }

    if (hasOwnProperty(body, 'backgroundColor')) {
      updates.backgroundColor = readOptionalString(body.backgroundColor);
    }

    if (hasOwnProperty(body, 'backgroundImageUrl')) {
      updates.backgroundImageUrl = readOptionalString(body.backgroundImageUrl);
    }

    if (hasOwnProperty(body, 'visibility')) {
      const visibility = readString(body.visibility);
      if (!visibility) {
        operatorError(res, 400, 'visibility must be a non-empty string');
        return;
      }
      updates.visibility = visibility;
    }

    if (hasOwnProperty(body, 'isArchived')) {
      const isArchived = readBoolean(body.isArchived);
      if (isArchived === undefined) {
        operatorError(res, 400, 'isArchived must be a boolean');
        return;
      }
      updates.isArchived = isArchived;
    }

    if (Object.keys(updates).length === 0) {
      operatorError(res, 400, 'No valid board fields were provided');
      return;
    }

    const board = await prisma.board.update({
      where: { id },
      data: updates,
    });

    logOperatorAction(req, 'board.update', body, { boardId: board.id });
    res.json({ board });
  } catch (error) {
    console.error('Operator update board error:', error);
    operatorError(res, 500, 'Failed to update board');
  }
}

export async function archiveBoard(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const board = await prisma.board.update({
      where: { id },
      data: { isArchived: true },
    });
    logOperatorAction(req, 'board.archive', { id }, { boardId: board.id });
    res.json({ board });
  } catch (error) {
    console.error('Operator archive board error:', error);
    operatorError(res, 500, 'Failed to archive board');
  }
}

export async function listLists(req: Request, res: Response): Promise<void> {
  try {
    const boardId = readString(req.query.boardId);
    if (!boardId) {
      operatorError(res, 400, 'boardId is required');
      return;
    }

    const lists = await prisma.list.findMany({
      where: { boardId },
      include: {
        _count: {
          select: {
            cards: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    res.json({ lists });
  } catch (error) {
    console.error('Operator list lists error:', error);
    operatorError(res, 500, 'Failed to list lists');
  }
}

export async function createList(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const boardId = readString(body.boardId);
    const title = readString(body.title);
    const backgroundColor = readOptionalString(body.backgroundColor);

    if (!boardId || !title) {
      operatorError(res, 400, 'boardId and title are required');
      return;
    }

    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } });
    if (!board) {
      operatorError(res, 404, 'Board not found');
      return;
    }

    const position = readNumber(body.position) ?? await getNextListPosition(boardId);

    const list = await prisma.list.create({
      data: {
        boardId,
        title,
        position,
        backgroundColor,
      },
    });

    logOperatorAction(req, 'list.create', body, { listId: list.id, boardId });
    res.status(201).json({ list });
  } catch (error) {
    console.error('Operator create list error:', error);
    operatorError(res, 500, 'Failed to create list');
  }
}

export async function updateList(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    if (hasOwnProperty(body, 'title')) {
      const title = readString(body.title);
      if (!title) {
        operatorError(res, 400, 'title must be a non-empty string');
        return;
      }
      updates.title = title;
    }

    if (hasOwnProperty(body, 'position')) {
      const position = readNumber(body.position);
      if (position === undefined) {
        operatorError(res, 400, 'position must be a number');
        return;
      }
      updates.position = position;
    }

    if (hasOwnProperty(body, 'backgroundColor')) {
      updates.backgroundColor = readOptionalString(body.backgroundColor);
    }

    if (hasOwnProperty(body, 'isArchived')) {
      const isArchived = readBoolean(body.isArchived);
      if (isArchived === undefined) {
        operatorError(res, 400, 'isArchived must be a boolean');
        return;
      }
      updates.isArchived = isArchived;
    }

    if (Object.keys(updates).length === 0) {
      operatorError(res, 400, 'No valid list fields were provided');
      return;
    }

    const list = await prisma.list.update({
      where: { id },
      data: updates,
    });

    logOperatorAction(req, 'list.update', body, { listId: list.id });
    res.json({ list });
  } catch (error) {
    console.error('Operator update list error:', error);
    operatorError(res, 500, 'Failed to update list');
  }
}

export async function archiveList(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const list = await prisma.list.update({
      where: { id },
      data: { isArchived: true },
    });
    logOperatorAction(req, 'list.archive', { id }, { listId: list.id });
    res.json({ list });
  } catch (error) {
    console.error('Operator archive list error:', error);
    operatorError(res, 500, 'Failed to archive list');
  }
}

export async function listCards(req: Request, res: Response): Promise<void> {
  try {
    const listId = readString(req.query.listId);
    if (!listId) {
      operatorError(res, 400, 'listId is required');
      return;
    }

    const cards = await prisma.card.findMany({
      where: { listId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    res.json({ cards });
  } catch (error) {
    console.error('Operator list cards error:', error);
    operatorError(res, 500, 'Failed to list cards');
  }
}

export async function createCard(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const listId = readString(body.listId);
    const title = readString(body.title);
    const description = readOptionalString(body.description);

    if (!listId || !title) {
      operatorError(res, 400, 'listId and title are required');
      return;
    }

    const list = await prisma.list.findUnique({
      where: { id: listId },
      include: {
        board: {
          include: {
            workspace: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (!list) {
      operatorError(res, 404, 'List not found');
      return;
    }

    const explicitCreator = hasOwnProperty(body, 'createdByUserId') || hasOwnProperty(body, 'createdByEmail');
    const creator = explicitCreator
      ? await resolveRequiredUser(body)
      : await prisma.user.findUnique({
          where: { id: list.board.workspace.ownerId },
          select: { id: true, email: true, name: true },
        });

    if (!creator) {
      operatorError(res, 404, 'Card creator was not found');
      return;
    }

    const position = readNumber(body.position) ?? await getNextCardPosition(listId);
    const dueDate = hasOwnProperty(body, 'dueDate') ? readDate(body.dueDate) : undefined;
    const startDate = hasOwnProperty(body, 'startDate') ? readDate(body.startDate) : undefined;

    const card = await prisma.card.create({
      data: {
        listId,
        title,
        description,
        position,
        createdBy: creator.id,
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logOperatorAction(req, 'card.create', body, { cardId: card.id, listId });
    res.status(201).json({ card });
  } catch (error) {
    console.error('Operator create card error:', error);
    operatorError(res, 500, error instanceof Error ? error.message : 'Failed to create card');
  }
}

export async function updateCard(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const { id } = req.params;
    const updates: Record<string, unknown> = {};

    if (hasOwnProperty(body, 'title')) {
      const title = readString(body.title);
      if (!title) {
        operatorError(res, 400, 'title must be a non-empty string');
        return;
      }
      updates.title = title;
    }

    if (hasOwnProperty(body, 'description')) {
      updates.description = readOptionalString(body.description);
    }

    if (hasOwnProperty(body, 'position')) {
      const position = readNumber(body.position);
      if (position === undefined) {
        operatorError(res, 400, 'position must be a number');
        return;
      }
      updates.position = position;
    }

    if (hasOwnProperty(body, 'listId')) {
      const listId = readString(body.listId);
      if (!listId) {
        operatorError(res, 400, 'listId must be a non-empty string');
        return;
      }
      updates.listId = listId;
    }

    if (hasOwnProperty(body, 'dueDate')) {
      updates.dueDate = readDate(body.dueDate);
    }

    if (hasOwnProperty(body, 'startDate')) {
      updates.startDate = readDate(body.startDate);
    }

    if (hasOwnProperty(body, 'isCompleted')) {
      const isCompleted = readBoolean(body.isCompleted);
      if (isCompleted === undefined) {
        operatorError(res, 400, 'isCompleted must be a boolean');
        return;
      }
      updates.isCompleted = isCompleted;
    }

    if (hasOwnProperty(body, 'isArchived')) {
      const isArchived = readBoolean(body.isArchived);
      if (isArchived === undefined) {
        operatorError(res, 400, 'isArchived must be a boolean');
        return;
      }
      updates.isArchived = isArchived;
    }

    if (Object.keys(updates).length === 0) {
      operatorError(res, 400, 'No valid card fields were provided');
      return;
    }

    const card = await prisma.card.update({
      where: { id },
      data: updates,
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logOperatorAction(req, 'card.update', body, { cardId: card.id });
    res.json({ card });
  } catch (error) {
    console.error('Operator update card error:', error);
    operatorError(res, 500, error instanceof Error ? error.message : 'Failed to update card');
  }
}

export async function archiveCard(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const card = await prisma.card.update({
      where: { id },
      data: { isArchived: true },
    });
    logOperatorAction(req, 'card.archive', { id }, { cardId: card.id });
    res.json({ card });
  } catch (error) {
    console.error('Operator archive card error:', error);
    operatorError(res, 500, 'Failed to archive card');
  }
}
