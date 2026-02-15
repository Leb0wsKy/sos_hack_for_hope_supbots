import express from 'express';
import { 
  getAnalytics,
  getHeatmapData,
  getVillageRatings,
  exportData
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { requireLevel2 } from '../middleware/roles.js';
import { logAudit } from '../middleware/auditLog.js';
import { cacheMiddleware, analyticsCacheKey } from '../middleware/cache.js';

const router = express.Router();

// All analytics routes require Level 3
router.use(protect);
router.use(requireLevel2);

// Global analytics - cache for 5 minutes (300 seconds)
router.get('/', logAudit('ACCESS_ANALYTICS'), cacheMiddleware(300, analyticsCacheKey), getAnalytics);

// Heatmap data - cache for 10 minutes (600 seconds)
router.get('/heatmap', logAudit('ACCESS_ANALYTICS'), cacheMiddleware(600, analyticsCacheKey), getHeatmapData);

// Village ratings - cache for 10 minutes (600 seconds)
router.get('/village-ratings', logAudit('ACCESS_ANALYTICS'), cacheMiddleware(600, analyticsCacheKey), getVillageRatings);

// Export data
router.get('/export', logAudit('EXPORT_DATA'), exportData);

export default router;
