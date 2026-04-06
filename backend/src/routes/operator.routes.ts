import { Router } from 'express';
import { authenticateOperator } from '../middleware/operator-auth.middleware';
import {
  archiveBoard,
  archiveCard,
  archiveList,
  createBoard,
  createCard,
  createList,
  createUser,
  createWorkspace,
  deleteWorkspace,
  getOperatorHealth,
  listBoards,
  listCards,
  listLists,
  listUsers,
  listWorkspaces,
  updateBoard,
  updateCard,
  updateList,
  updateUser,
  updateWorkspace,
} from '../controllers/operator.controller';

const router = Router();

router.use(authenticateOperator);

router.get('/health', getOperatorHealth);

router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);

router.get('/workspaces', listWorkspaces);
router.post('/workspaces', createWorkspace);
router.patch('/workspaces/:id', updateWorkspace);
router.delete('/workspaces/:id', deleteWorkspace);

router.get('/boards', listBoards);
router.post('/boards', createBoard);
router.patch('/boards/:id', updateBoard);
router.delete('/boards/:id', archiveBoard);

router.get('/lists', listLists);
router.post('/lists', createList);
router.patch('/lists/:id', updateList);
router.delete('/lists/:id', archiveList);

router.get('/cards', listCards);
router.post('/cards', createCard);
router.patch('/cards/:id', updateCard);
router.delete('/cards/:id', archiveCard);

export default router;
