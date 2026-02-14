import Signalement from '../models/Signalement.js';
import Village from '../models/Village.js';
import User from '../models/User.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { emitEvent } from '../services/socket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const maskAnonymousSignalement = (signalement) => {
  if (!signalement) return signalement;
  const data = signalement.toObject ? signalement.toObject() : { ...signalement };

  if (data.isAnonymous) {
    data.createdBy = null;
    data.childName = null;
    data.abuserName = null;
  }

  return data;
};

const enforceVillageScope = (req, signalement) => {
  const role = req.user.role;
  const roleDetails = req.user.roleDetails;

  if (role === 'LEVEL4') return null;
  if (role === 'LEVEL3' && roleDetails === 'NATIONAL_OFFICE') return null;

  const signalementVillageId = String(signalement.village?._id || signalement.village);
  const userVillageId = String(req.user.village?._id || req.user.village || '');

  if (role === 'LEVEL3' && roleDetails === 'VILLAGE_DIRECTOR') {
    return signalementVillageId === userVillageId ? null : 'Village scope violation';
  }

  if (role === 'LEVEL1') {
    return signalementVillageId === userVillageId ? null : 'Village scope violation';
  }

  if (role === 'LEVEL2') {
    const assignedTo = String(signalement.assignedTo?._id || signalement.assignedTo || '');
    if (assignedTo === String(req.user.id)) return null;
    return signalementVillageId === userVillageId ? null : 'Village scope violation';
  }

  return null;
};

// Create new signalement with file uploads
export const createSignalement = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      village, 
      program,
      incidentType,
      urgencyLevel,
      isAnonymous,
      childName,
      abuserName
    } = req.body;

    if (typeof isAnonymous === 'undefined') {
      return res.status(400).json({ message: 'isAnonymous is required' });
    }

    if (!description) {
      return res.status(400).json({ message: 'description is required' });
    }

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path
    })) : [];

    // AI detection placeholder - calculate suspicion score
    const aiSuspicionScore = calculateAISuspicionScore(description, incidentType);

    const resolvedVillage = village || req.user.village?._id || req.user.village || undefined;

    const signalement = new Signalement({
      title,
      description,
      village: resolvedVillage,
      program,
      incidentType,
      urgencyLevel,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      childName,
      abuserName,
      createdBy: req.user.id,
      attachments,
      aiSuspicionScore,
      aiFlags: aiSuspicionScore > 70 ? [{
        flag: 'HIGH_SUSPICION_SCORE',
        confidence: aiSuspicionScore,
        timestamp: new Date()
      }] : []
    });

    await signalement.save();

    // Update village statistics
    if (resolvedVillage) {
      await Village.findByIdAndUpdate(resolvedVillage, {
        $inc: { totalSignalements: 1 }
      });
    }

    // Populate before sending
    if (resolvedVillage) {
      await signalement.populate('village', 'name location');
    }
    await signalement.populate('createdBy', 'name email role');

    emitEvent('signalement.created', {
      id: signalement._id,
      village: signalement.village?._id || signalement.village,
      urgencyLevel: signalement.urgencyLevel || null
    });

    res.status(201).json(maskAnonymousSignalement(signalement));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// AI suspicion score calculator (placeholder)
function calculateAISuspicionScore(description, incidentType) {
  // This is a placeholder. In production, integrate with local NLP model
  let score = 0;
  
  const lowQualityIndicators = [
    'test', 'fake', 'essai', 'blague',
    description.length < 20,
    description.split(' ').length < 5
  ];
  
  lowQualityIndicators.forEach(indicator => {
    if (typeof indicator === 'boolean' && indicator) score += 20;
    else if (typeof indicator === 'string' && description.toLowerCase().includes(indicator)) score += 25;
  });
  
  return Math.min(score, 100);
}

// Get all signalements (with filtering)
export const getSignalements = async (req, res) => {
  try {
    const { status, village, urgencyLevel, incidentType, myVillage } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (village) filter.village = village;
    if (urgencyLevel) filter.urgencyLevel = urgencyLevel;
    if (incidentType) filter.incidentType = incidentType;

    if (req.user.role === 'LEVEL2' && village) {
      if (!req.accessibleVillages || !req.accessibleVillages.includes(village)) {
        return res.status(403).json({
          message: 'Access denied. You can only access signalements from your assigned villages.'
        });
      }
    }

    // Role-based filtering with village scope
    if (req.user.role === 'LEVEL1') {
      // Level 1 only sees their own village's reports
      filter.village = req.user.village?._id || req.user.village;
    } else if (req.user.role === 'LEVEL2') {
      // Level 2 can only see signalements from their assigned villages
      if (req.accessibleVillages && req.accessibleVillages.length > 0) {
        filter.village = { $in: req.accessibleVillages };
      }
      
      // Level 2 can only see:
      // 1. Unassigned signalements (EN_ATTENTE)
      // 2. Their own assigned signalements
      filter.$or = [
        { status: 'EN_ATTENTE', assignedTo: null },
        { assignedTo: req.user.id }
      ];
      
      // If they want only their primary village
      if (myVillage === 'true') {
        filter.village = req.user.village?._id || req.user.village;
      }
    } else if (req.user.role === 'LEVEL3' && req.user.roleDetails === 'VILLAGE_DIRECTOR') {
      filter.village = req.user.village?._id || req.user.village;
    }
    // Level 3 (national) and Level 4 see all
    
    const signalements = await Signalement.find(filter)
      .populate('createdBy', 'name email role roleDetails')
      .populate('village', 'name location region')
      .populate('assignedTo', 'name email')
      .populate('classifiedBy', 'name')
      .populate('workflow', 'currentStage status stages assignedTo classification')
      .sort({ createdAt: -1 });

    const masked = signalements.map(maskAnonymousSignalement);

    res.json(masked);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get signalement by ID
export const getSignalementById = async (req, res) => {
  try {
    const signalement = await Signalement.findById(req.params.id)
      .populate('createdBy', 'name email role roleDetails')
      .populate('village', 'name location region')
      .populate('assignedTo', 'name email role')
      .populate('classifiedBy', 'name')
      .populate('workflow');

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    res.json(maskAnonymousSignalement(signalement));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update signalement (Level 2+ with restrictions)
export const updateSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const signalement = await Signalement.findById(id).populate('village createdBy assignedTo');

    // Level 3/4 cannot use general update - only closure/archive
    if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      return res.status(403).json({ 
        message: 'Governance users cannot use general update. Use closure or archive endpoints instead.'
      });
    }

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    const ALLOWED_UPDATE_FIELDS = [
      'title',
      'description',
      'program',
      'incidentType',
      'urgencyLevel',
      'childName',
      'abuserName'
    ];

    ALLOWED_UPDATE_FIELDS.forEach(field => {
      if (req.body[field] !== undefined) {
        signalement[field] = req.body[field];
      }
    });

    await signalement.save();

    res.json(maskAnonymousSignalement(signalement));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Close signalement (Level 3)
export const closeSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { closureReason } = req.body;

    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    signalement.status = 'CLOTURE';
    signalement.closedBy = req.user.id;
    signalement.closedAt = new Date();
    signalement.closureReason = closureReason;

    await signalement.save();

    emitEvent('signalement.closed', {
      id: signalement._id,
      village: signalement.village,
      closedBy: req.user.id
    });

    res.json(maskAnonymousSignalement(signalement));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Archive signalement (Level 3)
export const archiveSignalement = async (req, res) => {
  try {
    const { id } = req.params;

    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    if (signalement.status !== 'CLOTURE') {
      return res.status(400).json({ message: 'Only closed signalements can be archived' });
    }

    signalement.isArchived = true;
    signalement.archivedBy = req.user.id;
    signalement.archivedAt = new Date();

    await signalement.save();

    emitEvent('signalement.archived', {
      id: signalement._id,
      village: signalement.village,
      archivedBy: req.user.id
    });

    res.json(maskAnonymousSignalement(signalement));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete signalement (Level 3 only - soft delete)
export const deleteSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const signalement = await Signalement.findById(id);

    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    await Signalement.findByIdAndDelete(id);

    // Update village statistics
    if (signalement.village) {
      await Village.findByIdAndUpdate(signalement.village, {
        $inc: { totalSignalements: -1 }
      });
    }

    res.json({ message: 'Signalement deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Assign signalement to Level 2 user
export const assignSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    // Validate target user exists, is active, and is Level 2
    const targetUser = await User.findById(userId).select('role isActive village');
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }
    if (!targetUser.isActive) {
      return res.status(400).json({ message: 'Target user is deactivated' });
    }
    if (targetUser.role !== 'LEVEL2') {
      return res.status(400).json({ message: 'Signalements can only be assigned to Level 2 users' });
    }

    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }

    signalement.assignedTo = userId;
    signalement.assignedAt = new Date();
    signalement.status = 'EN_COURS';

    await signalement.save();

    emitEvent('signalement.assigned', {
      id: signalement._id,
      village: signalement.village,
      assignedTo: userId
    });

    res.json(maskAnonymousSignalement(signalement));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Download attachment file
export const downloadAttachment = async (req, res) => {
  try {
    const { id, filename } = req.params;

    // Find signalement and verify attachment exists
    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    // Check if user has permission to view this signalement
    const scopeError = enforceVillageScope(req, signalement);
    if (scopeError) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (req.user.role === 'LEVEL2') {
      const isAssigned = signalement.assignedTo &&
        signalement.assignedTo.toString() === req.user.id;

      if (!isAssigned) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Find attachment in signalement
    const attachment = signalement.attachments.find(att => att.filename === filename);
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Build file path
    const filePath = path.join(__dirname, '../../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);

    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Sauvegarder signalement (Level 2 takes ownership)
export const sauvegarderSignalement = async (req, res) => {
  try {
    const { id } = req.params;

    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    // Check if already assigned to someone else
    if (signalement.assignedTo && signalement.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ 
        message: 'Ce signalement est déjà pris en charge par un autre utilisateur.',
        assignedTo: signalement.assignedTo
      });
    }

    // Check if already in treatment
    if (signalement.status === 'EN_COURS' && signalement.assignedTo && signalement.assignedTo.toString() === req.user.id) {
      return res.status(400).json({ 
        message: 'Vous avez déjà sauvegardé ce signalement.',
        sauvegardedAt: signalement.sauvegardedAt,
        deadlineAt: signalement.deadlineAt
      });
    }

    const now = new Date();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Update signalement
    signalement.status = 'EN_COURS';
    signalement.assignedTo = req.user.id;
    signalement.assignedAt = now;
    signalement.sauvegardedAt = now;
    signalement.deadlineAt = deadline;

    await signalement.save();

    await signalement.populate('village', 'name location region');
    await signalement.populate('assignedTo', 'name email role');

    res.json({
      message: 'Signalement sauvegardé avec succès. Vous avez 24 heures pour le clôturer.',
      signalement,
      deadlineAt: deadline,
      hoursRemaining: 24
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get signalements with deadline warnings
export const getMySignalementsWithDeadlines = async (req, res) => {
  try {
    if (req.user.role !== 'LEVEL2') {
      return res.status(403).json({ message: 'Access denied. Level 2 only.' });
    }

    const signalements = await Signalement.find({ 
      assignedTo: req.user.id,
      status: 'EN_COURS'
    })
      .populate('village', 'name location region')
      .populate('createdBy', 'name email role')
      .sort({ deadlineAt: 1 }); // Sort by deadline (earliest first)

    const now = new Date();
    
    const signalementsWithStatus = signalements.map(s => {
      const sig = s.toObject();
      
      if (sig.deadlineAt) {
        const timeRemaining = sig.deadlineAt - now;
        const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        
        sig.isDeadlineExpired = timeRemaining <= 0;
        sig.isDeadlineApproaching = hoursRemaining <= 6 && hoursRemaining > 0;
        sig.hoursRemaining = Math.max(0, hoursRemaining);
        sig.minutesRemaining = Math.max(0, minutesRemaining);
        sig.deadlineWarning = hoursRemaining <= 0 
          ? 'Délai expiré!' 
          : hoursRemaining <= 6 
            ? `Attention: ${hoursRemaining}h ${minutesRemaining}min restantes`
            : `${hoursRemaining}h ${minutesRemaining}min restantes`;
      }
      
      return sig;
    });

    res.json({
      count: signalementsWithStatus.length,
      signalements: signalementsWithStatus
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
