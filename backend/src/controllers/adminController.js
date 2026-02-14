import User from '../models/User.js';
import Village from '../models/Village.js';

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
