import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select('role roleDetails village accessibleVillages isActive temporaryRole')
      .populate('village', '_id name');

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized, user inactive' });
    }

    // Auto-cleanup expired temporary roles
    if (user.temporaryRole?.role && user.temporaryRole.expiresAt && new Date() > user.temporaryRole.expiresAt) {
      user.temporaryRole = undefined;
      await user.save();
    }

    // Resolve effective role (temporary overrides permanent)
    const effective = user.getEffectiveRole();

    req.user = {
      id: decoded.id,
      role: effective.role,
      roleDetails: effective.roleDetails,
      village: user.village,
      accessibleVillages: user.accessibleVillages,
      originalRole: user.role,
      isTemporaryRole: effective.isTemporary
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
