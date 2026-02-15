import express from 'express';
import {
  createWorkflow,
  getWorkflow,
  updateWorkflowStage,
  downloadTemplate,
  classifySignalement,
  addWorkflowNote,
  getMyWorkflows,
  escalateSignalement,
  closeWorkflow,
  markDpeGenerated
} from '../controllers/workflowController.js';
import { protect } from '../middleware/auth.js';
import { requireLevel2, checkWorkflowAssignment } from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All workflow routes require Level 2 or higher
router.use(protect);
router.use(requireLevel2);

// Download predefined templates (rapport-initial / rapport-final)
router.get('/templates/:templateName', downloadTemplate);

// Get my workflows (dashboard)
router.get('/my-workflows', logAudit('VIEW_SIGNALEMENT'), getMyWorkflows);

// Get workflow by signalement ID
router.get('/:signalementId', logAudit('VIEW_SIGNALEMENT'), getWorkflow);

// Create workflow
router.post('/', logAudit('CREATE_WORKFLOW', 'Workflow'), createWorkflow);

// Update workflow stage (assignment checked)
router.put(
  '/:workflowId/stage',
  checkWorkflowAssignment,
  upload.array('attachments', 5),
  logAudit('UPDATE_WORKFLOW', 'Workflow'),
  updateWorkflowStage
);

// Classify signalement (assignment checked)
router.put('/:workflowId/classify', 
  checkWorkflowAssignment,
  logAudit('CLASSIFY_SIGNALEMENT', 'Workflow'), 
  classifySignalement
);

// Escalate signalement (assignment checked)
router.put(
  '/:workflowId/escalate',
  checkWorkflowAssignment,
  logAudit('ESCALATE_SIGNALEMENT', 'Workflow'),
  escalateSignalement
);

// Add note (assignment checked)
router.post(
  '/:workflowId/notes',
  checkWorkflowAssignment,
  logAudit('UPDATE_WORKFLOW', 'Workflow'),
  addWorkflowNote
);

// Mark DPE as generated (assignment checked)
router.put(
  '/:workflowId/dpe-generated',
  checkWorkflowAssignment,
  logAudit('UPDATE_WORKFLOW', 'Workflow'),
  markDpeGenerated
);

// Close workflow — all 6 stages must be done (assignment checked)
router.put(
  '/:workflowId/close',
  checkWorkflowAssignment,
  logAudit('CLOSE_WORKFLOW', 'Workflow'),
  closeWorkflow
);

export default router;
