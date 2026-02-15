import Village from '../models/Village.js';
import Signalement from '../models/Signalement.js';

// Get all villages
export const getAllVillages = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      filter._id = req.user.village;
    }

    const villages = await Village.find(filter)
      .populate('director', 'name email')
      .sort({ name: 1 });

    res.json(villages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get village by ID
export const getVillageById = async (req, res) => {
  try {
    const village = await Village.findById(req.params.id)
      .populate('director', 'name email phone');

    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }

    if (req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      if (String(village._id) !== String(req.user.village)) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }
    }

    res.json(village);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new village (Level 3 only)
export const createVillage = async (req, res) => {
  try {
    const { name, location, region, director, programs, coordinates } = req.body;

    const village = new Village({
      name,
      location,
      region,
      director,
      programs,
      coordinates
    });

    await village.save();

    res.status(201).json(village);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update village
export const updateVillage = async (req, res) => {
  try {
    const village = await Village.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }

    res.json(village);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get village statistics
export const getVillageStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    const village = await Village.findById(id);
    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }

    if (req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      if (String(village._id) !== String(req.user.village)) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }
    }

    // Get signalement statistics
    const totalSignalements = await Signalement.countDocuments({ village: id });
    const enAttente = await Signalement.countDocuments({ village: id, status: 'EN_ATTENTE' });
    const enCours = await Signalement.countDocuments({ village: id, status: 'EN_COURS' });
    const cloture = await Signalement.countDocuments({ village: id, status: 'CLOTURE' });
    const fauxSignalements = await Signalement.countDocuments({ village: id, status: 'FAUX_SIGNALEMENT' });
    
    const urgentSignalements = await Signalement.countDocuments({ 
      village: id, 
      urgencyLevel: { $in: ['ELEVE', 'CRITIQUE'] }
    });

    // Get incident type breakdown
    const incidentTypes = await Signalement.aggregate([
      { $match: { village: village._id } },
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Update village statistics
    village.totalSignalements = totalSignalements;
    village.urgentSignalements = urgentSignalements;
    village.falseSignalements = fauxSignalements;
    
    // Calculate rating score (lower is better)
    const ratingScore = (urgentSignalements * 2 + fauxSignalements) / Math.max(totalSignalements, 1) * 100;
    village.ratingScore = Math.round(ratingScore);
    
    await village.save();

    res.json({
      village,
      statistics: {
        total: totalSignalements,
        enAttente,
        enCours,
        cloture,
        fauxSignalements,
        urgent: urgentSignalements,
        incidentTypes
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
