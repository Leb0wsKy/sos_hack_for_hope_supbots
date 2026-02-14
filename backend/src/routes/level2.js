import express from 'express';
import {
  listSignalements,
  getSignalementDetails,
  classifySignalement,
  updateWorkflowStep,
  saveDPEReport,
  escalateSignalement,
  closeSignalement,
  getNotifications,
  markNotificationRead
} from '../controllers/level2Controller.js';
import { protect } from '../middleware/auth.js';
import { requireLevel2 } from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

// All Level 2 routes require authentication + Level 2 role
router.use(protect);
router.use(requireLevel2);

// 1) List signalements for treatment
router.get('/signalements', 
  logAudit('VIEW_SIGNALEMENTS'),
  listSignalements
);

// 2) Get details of one signalement
router.get('/signalements/:id', 
  logAudit('VIEW_SIGNALEMENT', 'Signalement'),
  getSignalementDetails
);

// 3) Classify signalement
router.patch('/signalements/:id/classification', 
  logAudit('CLASSIFY_SIGNALEMENT', 'Signalement'),
  classifySignalement
);

// 4) Update workflow step state
router.patch('/signalements/:id/workflow', 
  logAudit('UPDATE_WORKFLOW', 'Signalement'),
  updateWorkflowStep
);

// 5) Save DPE report (manual)
router.put('/signalements/:id/reports/dpe', 
  logAudit('SAVE_DPE_REPORT', 'Signalement'),
  saveDPEReport
);

// 6) Escalate to Level 3 actors
router.post('/signalements/:id/escalate', 
  logAudit('ESCALATE_SIGNALEMENT', 'Signalement'),
  escalateSignalement
);

// 7) Close / archive decision
router.post('/signalements/:id/close', 
  logAudit('CLOSE_SIGNALEMENT', 'Signalement'),
  closeSignalement
);

// 8) Get notifications
router.get('/notifications', 
  logAudit('VIEW_NOTIFICATIONS'),
  getNotifications
);

// Mark notification as read
router.patch('/notifications/:id/read', 
  logAudit('MARK_NOTIFICATION_READ'),
  markNotificationRead
);

export default router;
