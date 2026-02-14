import Signalement from '../models/Signalement.js';

export const getAnalytics = async (req, res) => {
  try {
    const total = await Signalement.countDocuments();
    const pending = await Signalement.countDocuments({ status: 'pending' });
    const inProgress = await Signalement.countDocuments({ status: 'in-progress' });
    const resolved = await Signalement.countDocuments({ status: 'resolved' });

    const recentSignalements = await Signalement.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('createdBy', 'name email');

    res.json({
      total,
      pending,
      inProgress,
      resolved,
      recent: recentSignalements
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
