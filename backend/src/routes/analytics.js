import express from 'express';
import { getAnalytics } from '../controllers/analyticsController.js';
import { protect } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';

const router = express.Router();

router.get('/', protect, checkRole([3]), getAnalytics);

export default router;
