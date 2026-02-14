import express from 'express';
import {
  generateDPEDraft,
  getDPEDraft,
  updateDPEDraft,
  submitDPEDraft
} from '../controllers/dpeController.js';
import { protect } from '../middleware/auth.js';
import { requireLevel2 } from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Generate DPE draft with AI (Level 2+)
router.post('/:id/generate',
  requireLevel2,
  logAudit('GENERATE_DPE', 'Signalement'),
  generateDPEDraft
);

// Get existing DPE draft (Level 2+)
router.get('/:id',
  requireLevel2,
  logAudit('VIEW_DPE'),
  getDPEDraft
);

// Update DPE draft manually (Level 2+)
router.put('/:id',
  requireLevel2,
  logAudit('UPDATE_DPE', 'Signalement'),
  updateDPEDraft
);

// Submit DPE draft as final (Level 2+)
router.post('/:id/submit',
  requireLevel2,
  logAudit('SUBMIT_DPE', 'Signalement'),
  submitDPEDraft
);

export default router;
