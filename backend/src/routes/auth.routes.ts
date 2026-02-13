import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
  ],
  register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  login
);

// GET /api/auth/me (protected)
router.get('/me', authenticate, getMe);

// PUT /api/auth/me (protected)
router.put(
  '/me',
  authenticate,
  [
    body('name').optional().trim().notEmpty(),
    body('avatarUrl').optional().isURL(),
  ],
  updateProfile
);

export default router;
