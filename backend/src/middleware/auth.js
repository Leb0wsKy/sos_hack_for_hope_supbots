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
      .select('role roleDetails village accessibleVillages isActive')
      .populate('village', '_id name')
      .lean();

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized, user inactive' });
    }

    req.user = {
      id: decoded.id,
      role: user.role,
      roleDetails: user.roleDetails,
      village: user.village,
      accessibleVillages: user.accessibleVillages
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};
