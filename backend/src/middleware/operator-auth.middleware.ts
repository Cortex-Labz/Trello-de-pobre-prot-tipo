import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

function getPresentedApiKey(req: Request): string | null {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const headerApiKey = req.header('x-api-key');
  if (headerApiKey) {
    return headerApiKey.trim();
  }

  return null;
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

export function authenticateOperator(req: Request, res: Response, next: NextFunction): void {
  const configuredApiKey = process.env.TASK_OPERATOR_API_KEY;

  if (!configuredApiKey) {
    res.status(503).json({ error: 'Operator API is not configured' });
    return;
  }

  const presentedApiKey = getPresentedApiKey(req);
  if (!presentedApiKey || !safeCompare(presentedApiKey, configuredApiKey)) {
    res.status(401).json({ error: 'Invalid operator API key' });
    return;
  }

  next();
}
