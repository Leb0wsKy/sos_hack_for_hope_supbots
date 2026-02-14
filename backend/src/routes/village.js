import express from 'express';
import {
  getAllVillages,
  getVillageById,
  createVillage,
  updateVillage,
  getVillageStatistics
} from '../controllers/villageController.js';
import { protect } from '../middleware/auth.js';
import { requireLevel4 } from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';

const router = express.Router();

router.use(protect);

// Get all villages (all authenticated users)
router.get('/', getAllVillages);

// Get village by ID
router.get('/:id', getVillageById);

// Get village statistics
router.get('/:id/statistics', getVillageStatistics);

// Create village (Level 4 only)
router.post('/', requireLevel4, logAudit('CREATE_VILLAGE', 'Village'), createVillage);

// Update village (Level 4 only)
router.put('/:id', requireLevel4, logAudit('UPDATE_VILLAGE', 'Village'), updateVillage);

export default router;
