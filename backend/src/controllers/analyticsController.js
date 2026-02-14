import Signalement from '../models/Signalement.js';
import Village from '../models/Village.js';
import User from '../models/User.js';

const enforceVillageAnalyticsScope = (req, filter = {}) => {
  if (req.user.role === 'LEVEL3' && req.user.roleDetails === 'VILLAGE_DIRECTOR') {
    return { ...filter, village: req.user.village };
  }

  return filter;
};

// Global analytics for Level 3
export const getAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, village } = req.query;

    // Build filter
    let filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    if (village) filter.village = village;

    filter = enforceVillageAnalyticsScope(req, filter);

    // Overall statistics
    const total = await Signalement.countDocuments(filter);
    const enAttente = await Signalement.countDocuments({ ...filter, status: 'EN_ATTENTE' });
    const enCours = await Signalement.countDocuments({ ...filter, status: 'EN_COURS' });
    const cloture = await Signalement.countDocuments({ ...filter, status: 'CLOTURE' });
    const fauxSignalements = await Signalement.countDocuments({ ...filter, status: 'FAUX_SIGNALEMENT' });

    // Urgency breakdown
    const urgencyBreakdown = await Signalement.aggregate([
      { $match: filter },
      { $group: { _id: '$urgencyLevel', count: { $sum: 1 } } }
    ]);

    // Incident type breakdown
    const incidentTypeBreakdown = await Signalement.aggregate([
      { $match: filter },
      { $group: { _id: '$incidentType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Classification breakdown
    const classificationBreakdown = await Signalement.aggregate([
      { $match: { ...filter, classification: { $ne: null } } },
      { $group: { _id: '$classification', count: { $sum: 1 } } }
    ]);

    // By village
    const byVillage = await Signalement.aggregate([
      { $match: filter },
      { $group: { _id: '$village', count: { $sum: 1 } } },
      { $lookup: { from: 'villages', localField: '_id', foreignField: '_id', as: 'villageInfo' } },
      { $unwind: '$villageInfo' },
      { $project: { 
        villageName: '$villageInfo.name',
        count: 1,
        location: '$villageInfo.location'
      }},
      { $sort: { count: -1 } }
    ]);

    // Timeline data (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const timelineMatch = { ...filter };
    timelineMatch.createdAt = { $gte: thirtyDaysAgo };
    if (filter.createdAt?.$lte) {
      timelineMatch.createdAt.$lte = filter.createdAt.$lte;
    }

    const timeline = await Signalement.aggregate([
      { $match: timelineMatch },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { '_id': 1 } }
    ]);

    // Recent high-priority alerts
    const recentAlertFilter = {
      urgencyLevel: { $in: ['ELEVE', 'CRITIQUE'] },
      status: { $in: ['EN_ATTENTE', 'EN_COURS'] }
    };
    if (req.user.role === 'LEVEL3' && req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      recentAlertFilter.village = req.user.village;
    }

    const recentAlerts = await Signalement.find(recentAlertFilter)
      .populate('village', 'name location')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // User statistics
    const totalUsers = await User.countDocuments();
    const level1Users = await User.countDocuments({ role: 'LEVEL1' });
    const level2Users = await User.countDocuments({ role: 'LEVEL2' });
    const level3Users = await User.countDocuments({ role: 'LEVEL3' });

    res.json({
      overview: {
        total,
        enAttente,
        enCours,
        cloture,
        fauxSignalements,
        fauxSignalementsRate: total > 0 ? ((fauxSignalements / total) * 100).toFixed(2) : 0
      },
      urgencyBreakdown,
      incidentTypeBreakdown,
      classificationBreakdown,
      byVillage,
      timeline,
      recentAlerts,
      users: {
        total: totalUsers,
        level1: level1Users,
        level2: level2Users,
        level3: level3Users
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Heatmap data for Level 3
export const getHeatmapData = async (req, res) => {
  try {
    // Get all villages with their coordinates and signalement counts
    const villageFilter = { isActive: true };
    if (req.user.role === 'LEVEL3' && req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      villageFilter._id = req.user.village;
    }
    const villages = await Village.find(villageFilter);

    const heatmapData = await Promise.all(
      villages.map(async (village) => {
        const signalementCount = await Signalement.countDocuments({ 
          village: village._id 
        });

        const urgentCount = await Signalement.countDocuments({ 
          village: village._id,
          urgencyLevel: { $in: ['ELEVE', 'CRITIQUE'] }
        });

        const fauxCount = await Signalement.countDocuments({ 
          village: village._id,
          status: 'FAUX_SIGNALEMENT'
        });

        // Calculate severity score
        const severityScore = (urgentCount * 3 + signalementCount + fauxCount * 0.5);

        return {
          village: village.name,
          villageId: village._id,
          location: village.location,
          region: village.region,
          coordinates: village.coordinates,
          signalementCount,
          urgentCount,
          fauxCount,
          severityScore: Math.round(severityScore),
          ratingScore: village.ratingScore
        };
      })
    );

    // Sort by severity
    heatmapData.sort((a, b) => b.severityScore - a.severityScore);

    res.json({
      heatmapData,
      legend: {
        low: 'Severity < 10',
        medium: 'Severity 10-30',
        high: 'Severity 30-60',
        critical: 'Severity > 60'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Village ratings for Level 3
export const getVillageRatings = async (req, res) => {
  try {
    const villageFilter = { isActive: true };
    if (req.user.role === 'LEVEL3' && req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      villageFilter._id = req.user.village;
    }

    const villages = await Village.find(villageFilter)
      .populate('director', 'name email')
      .sort({ ratingScore: -1 });

    const ratingsData = await Promise.all(
      villages.map(async (village) => {
        const totalSignalements = await Signalement.countDocuments({ village: village._id });
        const urgentSignalements = await Signalement.countDocuments({ 
          village: village._id,
          urgencyLevel: { $in: ['ELEVE', 'CRITIQUE'] }
        });
        const fauxSignalements = await Signalement.countDocuments({ 
          village: village._id,
          status: 'FAUX_SIGNALEMENT'
        });
        const closedSignalements = await Signalement.countDocuments({ 
          village: village._id,
          status: 'CLOTURE'
        });

        return {
          village: village.name,
          villageId: village._id,
          location: village.location,
          region: village.region,
          director: village.director,
          ratingScore: village.ratingScore,
          statistics: {
            total: totalSignalements,
            urgent: urgentSignalements,
            faux: fauxSignalements,
            closed: closedSignalements,
            closureRate: totalSignalements > 0 ? ((closedSignalements / totalSignalements) * 100).toFixed(2) : 0
          },
          rating: village.ratingScore < 20 ? 'EXCELLENT' :
                  village.ratingScore < 40 ? 'BON' :
                  village.ratingScore < 60 ? 'MOYEN' :
                  village.ratingScore < 80 ? 'ATTENTION' : 'CRITIQUE'
        };
      })
    );

    res.json(ratingsData);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Export data for Level 3
export const exportData = async (req, res) => {
  try {
    const { format, startDate, endDate } = req.query;

    let filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    filter = enforceVillageAnalyticsScope(req, filter);

    const signalements = await Signalement.find(filter)
      .populate('village', 'name location region')
      .populate('createdBy', 'name email roleDetails')
      .populate('assignedTo', 'name email')
      .populate('classifiedBy', 'name')
      .lean();

    const masked = signalements.map((signalement) => {
      const record = { ...signalement };

      // Always redact PII from exports
      delete record.childName;
      delete record.abuserName;
      delete record.description;
      delete record.attachments;

      if (record.isAnonymous) {
        record.createdBy = null;
      }
      return record;
    });

    // Return as JSON (can be extended to CSV/Excel)
    res.json({
      exportDate: new Date(),
      totalRecords: signalements.length,
      data: masked
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
