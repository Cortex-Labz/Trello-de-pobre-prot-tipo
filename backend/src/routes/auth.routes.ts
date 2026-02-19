import { Router } from 'express';
import { body } from 'express-validator';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
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

// PUT /api/auth/me/password (protected)
router.put(
  '/me/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Senha atual é obrigatória'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres'),
  ],
  changePassword
);

// POST /api/auth/me/avatar (protected)
router.post(
  '/me/avatar',
  authenticate,
  [
    body('imageData').notEmpty().withMessage('Dados da imagem são obrigatórios'),
  ],
  uploadAvatar
);

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
