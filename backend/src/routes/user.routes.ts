import { Router } from 'express';
import { searchUsers } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/users/search?q=query (protected)
router.get('/search', authenticate, searchUsers);

export default router;
