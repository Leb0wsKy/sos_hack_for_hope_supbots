import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Signalement from '../models/Signalement.js';

const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;

const getClientKey = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.connection.remoteAddress || 'unknown';
};

const isRateLimited = (key) => {
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, first: now };

  if (now - entry.first > WINDOW_MS) {
    loginAttempts.set(key, { count: 1, first: now });
    return false;
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  return entry.count > MAX_ATTEMPTS;
};

// Registration is disabled for security
// All user accounts must be created by administrators directly in the database
// Use: npm run seed (for initial setup)
// Or: Create users via MongoDB directly or admin script

export const login = async (req, res) => {
  try {
    const clientKey = getClientKey(req);
    if (isRateLimited(clientKey)) {
      return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('village', 'name');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Reset rate limiter on successful login
    loginAttempts.delete(clientKey);

    const token = jwt.sign(
      { id: user._id, role: user.role, village: user.village },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email,
        role: user.role,
        roleDetails: user.roleDetails,
        village: user.village,
        childrenCount: user.childrenCount || 0
      } 
    });

    AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      targetModel: 'User',
      targetId: user._id,
      details: { method: req.method, path: req.path },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    }).catch((err) => console.error('Audit log error:', err));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user profile with their signalements
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('village', 'name location programs');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's signalements (only for level 1 users - created by them)
    let signalements = [];
    if (user.role === 'LEVEL1') {
      signalements = await Signalement.find({ 
        createdBy: user._id 
      })
        .select('title description incidentType urgencyLevel status createdAt')
        .populate('village', 'name')
        .sort({ createdAt: -1 })
        .limit(10); // Get last 10 signalements
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        roleDetails: user.roleDetails,
        village: user.village,
        childrenCount: user.childrenCount || 0,
        phone: user.phone,
        lastLogin: user.lastLogin
      },
      signalements
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
