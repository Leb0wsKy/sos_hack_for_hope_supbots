import express from 'express';
import { login, getProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Registration is disabled - all accounts must be created by administrators
// Use the seed script or create users directly in the database
router.post('/login', login);

// Get current user profile with their signalements
router.get('/profile', protect, getProfile);

export default router;
