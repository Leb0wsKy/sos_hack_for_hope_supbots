import Signalement from '../models/Signalement.js';

export const createSignalement = async (req, res) => {
  try {
    const { title, description, location } = req.body;
    const signalement = new Signalement({
      title,
      description,
      location,
      createdBy: req.user.id
    });

    await signalement.save();
    res.status(201).json(signalement);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getSignalements = async (req, res) => {
  try {
    const signalements = await Signalement.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(signalements);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const signalement = await Signalement.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    res.json(signalement);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const deleteSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const signalement = await Signalement.findByIdAndDelete(id);

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    res.json({ message: 'Signalement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
