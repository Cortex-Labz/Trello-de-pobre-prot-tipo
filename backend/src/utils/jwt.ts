import jwt from 'jsonwebtoken';

const getSecret = () => process.env.JWT_SECRET || 'default-secret-change-in-production';
const getExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

export interface JwtPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), {
    expiresIn: getExpiresIn() as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}
