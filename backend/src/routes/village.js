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
import { cacheMiddleware, invalidateCache, villageCacheKey } from '../middleware/cache.js';

const router = express.Router();

router.use(protect);

// Get all villages (all authenticated users) - cache for 30 minutes
router.get('/', cacheMiddleware(1800, villageCacheKey), getAllVillages);

// Get village by ID - cache for 30 minutes
router.get('/:id', cacheMiddleware(1800), getVillageById);

// Get village statistics - cache for 10 minutes
router.get('/:id/statistics', cacheMiddleware(600), getVillageStatistics);

// Create village (Level 4 only)
router.post('/', requireLevel4, logAudit('CREATE_VILLAGE', 'Village'), invalidateCache(['cache:villages:*', 'cache:analytics:*']), createVillage);

// Update village (Level 4 only)
router.put('/:id', requireLevel4, logAudit('UPDATE_VILLAGE', 'Village'), invalidateCache(['cache:villages:*', 'cache:analytics:*']), updateVillage);

export default router;
