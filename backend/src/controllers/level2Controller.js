import Signalement from '../models/Signalement.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { emitEvent } from '../services/socket.js';
import { notifySignalementStatusChanged } from '../services/emailService.js';

/**
 * 1) List signalements for Level 2 treatment
 * GET /api/level2/signalements?status=&village=&classification=&step=
 */
export const listSignalements = async (req, res) => {
  try {
    const { status, village, classification, step, page = 1, limit = 20 } = req.query;
    
    let filter = {};
    
    // Apply filters
    if (status) filter.status = status;
    if (village) filter.village = village;
    if (classification) filter.classification = classification;
    if (step) filter['workflow.currentStep'] = step;
    
    // Level 2 users see signalements from their accessible villages
    if (req.user.role === 'LEVEL2') {
      if (req.user.village) {
        filter.village = req.user.village;
      }
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const signalements = await Signalement.find(filter)
      .populate('village', 'name region')
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();
    
    const total = await Signalement.countDocuments(filter);
    
    res.json({
      success: true,
      signalements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 2) Get details of one signalement
 * GET /api/level2/signalements/:id
 */
export const getSignalementDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const signalement = await Signalement.findById(id)
      .populate('village', 'name region location')
      .populate('createdBy', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('classifiedBy', 'name email')
      .populate('escalatedBy', 'name email')
      .populate('workflow.steps.updatedBy', 'name email')
      .populate('reports.dpeDraft.metadata.generatedBy', 'name email')
      .populate('reports.dpeFinal.metadata.submittedBy', 'name email');
    
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }
    
    res.json({
      success: true,
      signalement
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 3) Classify signalement
 * PATCH /api/level2/signalements/:id/classification
 */
export const classifySignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { classification, note } = req.body;
    
    // Validate classification
    const validClassifications = ['SAUVEGARDE', 'PRISE_EN_CHARGE', 'FAUX'];
    if (!classification || !validClassifications.includes(classification)) {
      return res.status(400).json({ 
        message: 'Classification invalide. Valeurs acceptées: SAUVEGARDE, PRISE_EN_CHARGE, FAUX' 
      });
    }
    
    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }
    
    // Update classification
    signalement.classification = classification;
    signalement.classifiedBy = req.user.id;
    signalement.classifiedAt = new Date();
    
    // Update status if marked as false
    if (classification === 'FAUX') {
      signalement.status = 'FAUX_SIGNALEMENT';
    } else if (signalement.status === 'EN_ATTENTE') {
      signalement.status = 'EN_COURS';
    }
    
    await signalement.save();
    
    // Audit log
    await AuditLog.create({
      action: 'CLASSIFY_SIGNALEMENT',
      targetModel: 'Signalement',
      targetId: signalement._id,
      user: req.user.id,
      details: { classification, note },
      ipAddress: req.ip
    });
    
    // Socket notification
    emitEvent('signalement:classified', {
      id: signalement._id,
      classification,
      village: signalement.village,
      classifiedBy: req.user.id
    });
    
    // Create notification for assigned user
    if (signalement.assignedTo) {
      await Notification.create({
        user: signalement.assignedTo,
        type: 'SIGNALEMENT_CLASSIFIED',
        signalement: signalement._id,
        title: 'Signalement classifié',
        message: `Signalement classifié comme ${classification}`,
        priority: 'NORMAL',
        createdBy: req.user.id
      });
    }

    // Email Level 1 creator about the classification / status change
    if (signalement.createdBy) {
      User.findById(signalement.createdBy).select('email name').then(creator => {
        if (creator) {
          notifySignalementStatusChanged({
            email: creator.email,
            name: creator.name,
            signalementTitle: signalement.title,
            oldStatus: 'EN_ATTENTE',
            newStatus: signalement.status,
            signalementId: signalement._id
          }).catch(err => console.error('Email notification error:', err.message));
        }
      }).catch(err => console.error('Email notification lookup error:', err.message));
    }
    
    res.json({
      success: true,
      message: 'Signalement classifié avec succès',
      signalement
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 4) Update workflow step state
 * PATCH /api/level2/signalements/:id/workflow
 */
export const updateWorkflowStep = async (req, res) => {
  try {
    const { id } = req.params;
    const { step, status, dueAt } = req.body;
    
    // Validate step
    const validSteps = [
      'FICHE_INITIALE_DPE',
      'EVALUATION_COMPLETE',
      'PLAN_ACTION',
      'RAPPORT_SUIVI',
      'RAPPORT_FINAL',
      'AVIS_CLOTURE'
    ];
    
    if (!step || !validSteps.includes(step)) {
      return res.status(400).json({ 
        message: 'Étape de workflow invalide' 
      });
    }
    
    // Validate status
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'DONE'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Statut invalide. Valeurs: NOT_STARTED, IN_PROGRESS, DONE' 
      });
    }
    
    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }
    
    // Initialize workflow if not exists
    if (!signalement.workflow) {
      signalement.workflow = { currentStep: 'FICHE_INITIALE_DPE', steps: [] };
    }
    if (!signalement.workflow.steps) {
      signalement.workflow.steps = [];
    }
    
    // Find or create step
    let stepIndex = signalement.workflow.steps.findIndex(s => s.step === step);
    
    if (stepIndex === -1) {
      signalement.workflow.steps.push({
        step,
        status,
        dueAt: dueAt ? new Date(dueAt) : undefined,
        updatedBy: req.user.id
      });
      stepIndex = signalement.workflow.steps.length - 1;
    } else {
      signalement.workflow.steps[stepIndex].status = status;
      signalement.workflow.steps[stepIndex].updatedBy = req.user.id;
      if (dueAt) signalement.workflow.steps[stepIndex].dueAt = new Date(dueAt);
    }
    
    // Update timestamps
    if (status === 'IN_PROGRESS' && !signalement.workflow.steps[stepIndex].startedAt) {
      signalement.workflow.steps[stepIndex].startedAt = new Date();
    }
    if (status === 'DONE') {
      signalement.workflow.steps[stepIndex].completedAt = new Date();
    }
    
    // Update currentStep if status is DONE
    if (status === 'DONE') {
      const currentStepIndex = validSteps.indexOf(step);
      if (currentStepIndex < validSteps.length - 1) {
        signalement.workflow.currentStep = validSteps[currentStepIndex + 1];
      }
    }
    
    await signalement.save();
    
    // Audit log
    await AuditLog.create({
      action: 'UPDATE_WORKFLOW',
      targetModel: 'Signalement',
      targetId: signalement._id,
      user: req.user.id,
      details: { step, status, dueAt },
      ipAddress: req.ip
    });
    
    // Socket notification
    emitEvent('signalement:workflowUpdated', {
      id: signalement._id,
      step,
      status,
      village: signalement.village
    });
    
    res.json({
      success: true,
      message: 'Workflow mis à jour',
      workflow: signalement.workflow
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 5) Save DPE report (manual)
 * PUT /api/level2/signalements/:id/reports/dpe
 */
export const saveDPEReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { dpeFinal, dpeText } = req.body;
    
    if (!dpeFinal && !dpeText) {
      return res.status(400).json({ 
        message: 'dpeFinal ou dpeText requis' 
      });
    }
    
    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }
    
    // Initialize reports if not exists
    if (!signalement.reports) signalement.reports = {};
    if (!signalement.reports.dpeFinal) signalement.reports.dpeFinal = {};
    
    // Store the report
    signalement.reports.dpeFinal.content = dpeFinal || { text: dpeText };
    signalement.reports.dpeFinal.metadata = {
      submittedAt: new Date(),
      submittedBy: req.user.id
    };
    
    await signalement.save();
    
    // Audit log
    await AuditLog.create({
      action: 'GENERATE_REPORT',
      targetModel: 'Signalement',
      targetId: signalement._id,
      user: req.user.id,
      details: { reportType: 'dpeFinal' },
      ipAddress: req.ip
    });
    
    // Socket notification
    emitEvent('signalement:reportSubmitted', {
      id: signalement._id,
      reportType: 'dpeFinal',
      village: signalement.village
    });
    
    res.json({
      success: true,
      message: 'Rapport DPE enregistré',
      report: signalement.reports.dpeFinal
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 6) Escalate to Level 3 actors
 * POST /api/level2/signalements/:id/escalate
 */
export const escalateSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { targets, note } = req.body;
    
    // Validate targets
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ 
        message: 'targets requis (array)' 
      });
    }
    
    const validTargets = ['DIRECTEUR_VILLAGE', 'BUREAU_NATIONAL'];
    const invalidTargets = targets.filter(t => !validTargets.includes(t));
    if (invalidTargets.length > 0) {
      return res.status(400).json({ 
        message: `Cibles invalides: ${invalidTargets.join(', ')}` 
      });
    }
    
    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }
    
    // Update escalation
    signalement.escalated = true;
    signalement.escalatedTo = targets;
    signalement.escalatedBy = req.user.id;
    signalement.escalatedAt = new Date();
    signalement.escalationNote = note || '';
    
    await signalement.save();
    
    // Audit log
    await AuditLog.create({
      action: 'ESCALATE_SIGNALEMENT',
      targetModel: 'Signalement',
      targetId: signalement._id,
      user: req.user.id,
      details: { targets, note },
      ipAddress: req.ip
    });
    
    // Socket notification
    emitEvent('signalement:escalated', {
      id: signalement._id,
      targets,
      village: signalement.village,
      escalatedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Signalement escaladé',
      signalement
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 7) Close / archive decision
 * POST /api/level2/signalements/:id/close
 */
export const closeSignalement = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const signalement = await Signalement.findById(id);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }
    
    // Update status
    signalement.status = 'CLOTURE';
    signalement.closedBy = req.user.id;
    signalement.closedAt = new Date();
    signalement.closureReason = reason || '';
    
    await signalement.save();
    
    // Audit log
    await AuditLog.create({
      action: 'CLOSE_SIGNALEMENT',
      targetModel: 'Signalement',
      targetId: signalement._id,
      user: req.user.id,
      details: { reason },
      ipAddress: req.ip
    });
    
    // Socket notification
    emitEvent('signalement:closed', {
      id: signalement._id,
      village: signalement.village,
      closedBy: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Signalement clôturé',
      signalement
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * 8) Get notifications for current user
 * GET /api/level2/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const { unreadOnly = false, page = 1, limit = 20 } = req.query;
    
    let filter = { user: req.user.id };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(filter)
      .populate('signalement', 'title description urgencyLevel status')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Mark notification as read
 * PATCH /api/level2/notifications/:id/read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOne({ _id: id, user: req.user.id });
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
