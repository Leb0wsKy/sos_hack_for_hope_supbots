import express from 'express';
import {
  createUser,
  listUsers,
  updateUserStatus,
  resetUserPassword,
  updateUserRole,
  deleteUser,
  getAdminSignalements,
  getAdminAuditLogs,
  grantTemporaryRole,
  revokeTemporaryRole
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
router.put('/users/:id/role', logAudit('UPDATE_USER_ROLE', 'User'), updateUserRole);
router.put('/users/:id/reset-password', logAudit('RESET_PASSWORD', 'User'), resetUserPassword);
router.delete('/users/:id', logAudit('DELETE_USER', 'User'), deleteUser);

// Temporary roles
router.post('/users/:id/temp-role', logAudit('GRANT_TEMP_ROLE', 'User'), grantTemporaryRole);
router.delete('/users/:id/temp-role', logAudit('REVOKE_TEMP_ROLE', 'User'), revokeTemporaryRole);

// Signalements (admin view)
router.get('/signalements', logAudit('VIEW_ALL_SIGNALEMENTS', 'Signalement'), getAdminSignalements);

// Audit logs
router.get('/audit-logs', logAudit('VIEW_AUDIT_LOGS', 'AuditLog'), getAdminAuditLogs);

export default router;
