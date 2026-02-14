import express from 'express';
import {
  createSignalement,
  getSignalements,
  updateSignalement,
  deleteSignalement
} from '../controllers/signalementController.js';
import { protect } from '../middleware/auth.js';
import { checkRole } from '../middleware/roles.js';

const router = express.Router();

router.post('/', protect, createSignalement);
router.get('/', protect, getSignalements);
router.put('/:id', protect, checkRole([2, 3]), updateSignalement);
router.delete('/:id', protect, checkRole([3]), deleteSignalement);

export default router;
