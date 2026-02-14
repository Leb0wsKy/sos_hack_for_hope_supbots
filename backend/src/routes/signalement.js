import express from 'express';
import {
  createSignalement,
  getSignalements,
  getSignalementById,
  updateSignalement,
  deleteSignalement,
  closeSignalement,
  archiveSignalement,
  assignSignalement,
  downloadAttachment,
  sauvegarderSignalement,
  getMySignalementsWithDeadlines
} from '../controllers/signalementController.js';
import { protect } from '../middleware/auth.js';
import { 
  requireLevel1, 
  requireLevel2, 
  requireLevel3,
  checkVillageScope,
  checkAssignment,
  allowGovernanceOperation
} from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create signalement with file uploads (Level 1+)
router.post('/', 
  requireLevel1,
  upload.array('attachments', 5),
  logAudit('CREATE_SIGNALEMENT', 'Signalement'),
  createSignalement
);

// Get all signalements (filtered by role and village scope)
router.get('/', 
  checkVillageScope,
  logAudit('VIEW_SIGNALEMENT'),
  getSignalements
);

// Get my signalements with deadline tracking (Level 2)
router.get('/my-deadlines',
  requireLevel2,
  logAudit('VIEW_SIGNALEMENT'),
  getMySignalementsWithDeadlines
);

// Get signalement by ID
router.get('/:id',
  logAudit('VIEW_SIGNALEMENT'),
  getSignalementById
);

// Download attachment file
router.get('/:id/attachments/:filename',
  logAudit('DOWNLOAD_ATTACHMENT'),
  downloadAttachment
);

// Update signalement (Level 2+ with assignment check)
router.put('/:id', 
  requireLevel2,
  checkAssignment,
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  updateSignalement
);

// Assign signalement to Level 2 user (Level 2+)
router.put('/:id/assign',
  requireLevel2,
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  assignSignalement
);

// Sauvegarder signalement (Level 2 takes ownership with 24h deadline)
router.put('/:id/sauvegarder',
  requireLevel2,
  logAudit('SAUVEGARDER_SIGNALEMENT', 'Signalement'),
  sauvegarderSignalement
);

// Close signalement (Level 3 only - governance operation)
router.put('/:id/close',
  allowGovernanceOperation,
  logAudit('CLOSE_SIGNALEMENT', 'Signalement'),
  closeSignalement
);

// Archive signalement (Level 3 only - governance operation)
router.put('/:id/archive',
  allowGovernanceOperation,
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  archiveSignalement
);

// Delete signalement (Level 3 only)
router.delete('/:id', 
  requireLevel3,
  logAudit('DELETE_SIGNALEMENT', 'Signalement'),
  deleteSignalement
);

export default router;
