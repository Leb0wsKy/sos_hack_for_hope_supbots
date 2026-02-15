import User from '../models/User.js';
import Village from '../models/Village.js';
import Signalement from '../models/Signalement.js';
import AuditLog from '../models/AuditLog.js';

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, ...rest } = user.toObject();
  return rest;
};

export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      roleDetails,
      village,
      accessibleVillages,
      phone
    } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists' });
    }

    if (['LEVEL1', 'LEVEL2'].includes(role) && !village) {
      return res.status(400).json({ message: 'Village is required for LEVEL1 and LEVEL2 users' });
    }

    if (role === 'LEVEL4' && roleDetails && roleDetails !== 'SUPER_ADMIN') {
      return res.status(400).json({ message: 'LEVEL4 roleDetails must be SUPER_ADMIN' });
    }

    if (village) {
      const villageExists = await Village.findById(village);
      if (!villageExists) {
        return res.status(404).json({ message: 'Village not found' });
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      roleDetails,
      village: village || undefined,
      accessibleVillages: accessibleVillages || [],
      phone: phone || undefined,
      isActive: true
    });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const listUsers = async (req, res) => {
  try {
    const { role, isActive, village } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (typeof isActive !== 'undefined') filter.isActive = isActive === 'true';
    if (village) filter.village = village;

    const users = await User.find(filter)
      .populate('village', 'name location')
      .sort({ createdAt: -1 });

    res.json({ users: users.map(sanitizeUser) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).populate('village', 'name location');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'newPassword is required' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, roleDetails, village, accessibleVillages } = req.body;

    if (!role) {
      return res.status(400).json({ message: 'role is required' });
    }

    const validRoles = ['LEVEL1', 'LEVEL2', 'LEVEL3', 'LEVEL4'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Don't allow editing your own role
    if (id === req.user.id) {
      return res.status(403).json({ message: 'Cannot change your own role' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    if (roleDetails) user.roleDetails = roleDetails;
    if (village) user.village = village;
    if (accessibleVillages) user.accessibleVillages = accessibleVillages;

    // Clear village for LEVEL3/LEVEL4 users
    if (['LEVEL3', 'LEVEL4'].includes(role)) {
      user.village = undefined;
    }

    await user.save();

    const updatedUser = await User.findById(id).populate('village', 'name location');
    res.json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (id === req.user.id) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all signalements (admin view)
export const getAdminSignalements = async (req, res) => {
  try {
    const { status, priority, village, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (village) filter.village = village;

    const total = await Signalement.countDocuments(filter);
    const signalements = await Signalement.find(filter)
      .populate('createdBy', 'name email role roleDetails')
      .populate('assignedTo', 'name email role roleDetails')
      .populate('village', 'name location region')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      signalements,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get audit logs
export const getAdminAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const total = await AuditLog.countDocuments();
    const logs = await AuditLog.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Grant temporary role to a user
export const grantTemporaryRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, roleDetails, duration } = req.body;
    // duration: number of hours, or null/0 for manual (no expiry)

    if (!role) {
      return res.status(400).json({ message: 'role is required' });
    }

    const validRoles = ['LEVEL1', 'LEVEL2', 'LEVEL3', 'LEVEL4'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (id === req.user.id) {
      return res.status(403).json({ message: 'Cannot grant temporary role to yourself' });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.temporaryRole = {
      role,
      roleDetails: roleDetails || undefined,
      expiresAt: duration ? new Date(Date.now() + duration * 3600000) : null,
      grantedBy: req.user.id,
      grantedAt: new Date()
    };

    await user.save();

    const updatedUser = await User.findById(id)
      .populate('village', 'name location')
      .populate('temporaryRole.grantedBy', 'name email');

    res.json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Revoke temporary role from a user
export const revokeTemporaryRole = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.temporaryRole?.role) {
      return res.status(400).json({ message: 'User has no temporary role' });
    }

    user.temporaryRole = undefined;
    await user.save();

    const updatedUser = await User.findById(id).populate('village', 'name location');
    res.json({ user: sanitizeUser(updatedUser), message: 'Temporary role revoked' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
