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
  markAsFaux,
  predictFalseAlarm,
  getMySignalementsWithDeadlines,
  directorSign,
  directorForward
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
import { cacheMiddleware, invalidateCache, signalementCacheKey } from '../middleware/cache.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create signalement with file uploads (Level 1+)
router.post('/', 
  requireLevel1,
  upload.array('attachments', 5),
  logAudit('CREATE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  createSignalement
);

// Get all signalements (filtered by role and village scope) - cache for 2 minutes
router.get('/', 
  checkVillageScope,
  logAudit('VIEW_SIGNALEMENT'),
  cacheMiddleware(120, signalementCacheKey),
  getSignalements
);

// Get my signalements with deadline tracking (Level 2) - cache for 1 minute
router.get('/my-deadlines',
  requireLevel2,
  logAudit('VIEW_SIGNALEMENT'),
  cacheMiddleware(60, signalementCacheKey),
  getMySignalementsWithDeadlines
);

// Get signalement by ID - cache for 5 minutes
router.get('/:id',
  logAudit('VIEW_SIGNALEMENT'),
  cacheMiddleware(300),
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
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  updateSignalement
);

// Assign signalement to Level 2 user (Level 2+)
router.put('/:id/assign',
  requireLevel2,
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  assignSignalement
);

// Sauvegarder signalement (Level 2 takes ownership with 24h deadline)
router.put('/:id/sauvegarder',
  requireLevel2,
  logAudit('SAUVEGARDER_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  sauvegarderSignalement
);

// Get ML prediction for false alarm (Level 2)
router.get('/:id/predict-false-alarm',
  requireLevel2,
  predictFalseAlarm
);

// Mark signalement as fausse alarme (Level 2 — direct reject)
router.put('/:id/faux',
  requireLevel2,
  logAudit('MARK_FAUX_SIGNALEMENT', 'Signalement'),
  markAsFaux
);

// Close signalement (Level 3 only - governance operation)
router.put('/:id/close',
  allowGovernanceOperation,
  logAudit('CLOSE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  closeSignalement
);

// Archive signalement (Level 3 only - governance operation)
router.put('/:id/archive',
  allowGovernanceOperation,
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  archiveSignalement
);

// Director Village — sign dossier (VILLAGE_DIRECTOR only)
router.post('/:id/director/sign',
  requireLevel2,
  upload.single('signatureImage'),
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  directorSign
);

// Director Village — forward signed dossier to national
router.post('/:id/director/forward',
  requireLevel2,
  logAudit('UPDATE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  directorForward
);

// Delete signalement (Level 3 only)
router.delete('/:id', 
  requireLevel3,
  logAudit('DELETE_SIGNALEMENT', 'Signalement'),
  invalidateCache(['cache:signalements:*', 'cache:analytics:*']),
  deleteSignalement
);

export default router;
