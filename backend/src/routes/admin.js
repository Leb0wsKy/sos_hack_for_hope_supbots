import express from 'express';
import {
  createUser,
  listUsers,
  updateUserStatus,
  resetUserPassword
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { requireLevel4 } from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);
router.use(requireLevel4);

// Users
router.get('/users', logAudit('VIEW_USERS', 'User'), listUsers);
router.post('/users', logAudit('CREATE_USER', 'User'), createUser);
router.put('/users/:id/status', logAudit('UPDATE_USER', 'User'), updateUserStatus);
router.put('/users/:id/reset-password', logAudit('RESET_PASSWORD', 'User'), resetUserPassword);

export default router;
