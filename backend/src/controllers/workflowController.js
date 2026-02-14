import Workflow from '../models/Workflow.js';
import Signalement from '../models/Signalement.js';
import { emitEvent } from '../services/socket.js';

// Create workflow for a signalement
export const createWorkflow = async (req, res) => {
  try {
    const { signalementId } = req.body;

    const signalement = await Signalement.findById(signalementId);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    // Check if workflow already exists
    const existingWorkflow = await Workflow.findOne({ signalement: signalementId });
    if (existingWorkflow) {
      return res.status(400).json({ message: 'Workflow already exists for this signalement' });
    }

    const workflow = new Workflow({
      signalement: signalementId,
      assignedTo: req.user.id
    });

    await workflow.save();

    // Update signalement
    signalement.workflow = workflow._id;
    signalement.assignedTo = req.user.id;
    signalement.assignedAt = new Date();
    signalement.status = 'EN_COURS';
    await signalement.save();

    emitEvent('workflow.created', {
      id: workflow._id,
      signalement: signalement._id,
      assignedTo: req.user.id,
      village: signalement.village
    });

    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get workflow by signalement ID
export const getWorkflow = async (req, res) => {
  try {
    const { signalementId } = req.params;
    
    const workflow = await Workflow.findOne({ signalement: signalementId })
      .populate('signalement')
      .populate('assignedTo', 'name email role')
      .populate('notes.createdBy', 'name');

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Add read-only indicator for governance users
    const response = workflow.toObject();
    if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      response.readOnly = true;
      response.canEdit = false;
      response.allowedActions = ['view', 'closure-decision'];
    } else if (req.user.role === 'LEVEL2') {
      const isAssigned = workflow.assignedTo && 
                         workflow.assignedTo._id.toString() === req.user.id;
      response.readOnly = !isAssigned;
      response.canEdit = isAssigned;
      response.allowedActions = isAssigned ? ['view', 'edit', 'update-stages'] : ['view'];
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update workflow stage (assignment checked by middleware)
export const updateWorkflowStage = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { stage, content, dueAt } = req.body;

    // Use workflow from middleware if available
    const workflow = req.workflow || await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const validStages = [
      'initialReport',
      'dpeReport',
      'evaluation',
      'actionPlan',
      'followUpReport',
      'finalReport',
      'closureNotice'
    ];
    
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: 'Invalid stage' });
    }

    // Enforce sequential stage completion
    const stageIndex = validStages.indexOf(stage);
    for (let i = 0; i < stageIndex; i++) {
      if (!workflow.stages[validStages[i]].completed) {
        return res.status(400).json({
          message: `Cannot complete '${stage}' before '${validStages[i]}'. Stages must be completed in order.`,
          missingStage: validStages[i]
        });
      }
    }

    // Update stage
    workflow.stages[stage].completed = true;
    workflow.stages[stage].completedAt = new Date();
    workflow.stages[stage].completedBy = req.user.id;
    workflow.stages[stage].content = content;

    if (dueAt) {
      workflow.stages[stage].dueAt = new Date(dueAt);
    }

    if (req.files?.length) {
      const attachments = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path
      }));

      const existing = workflow.stages[stage].attachments || [];
      workflow.stages[stage].attachments = existing.concat(attachments);
    }

    if (workflow.stages[stage].dueAt) {
      workflow.stages[stage].isOverdue =
        workflow.stages[stage].completedAt > workflow.stages[stage].dueAt;
    }

    // Update current stage
    const stageMap = {
      'initialReport': 'INITIAL',
      'dpeReport': 'DPE',
      'evaluation': 'EVALUATION',
      'actionPlan': 'ACTION_PLAN',
      'followUpReport': 'FOLLOW_UP',
      'finalReport': 'FINAL_REPORT',
      'closureNotice': 'CLOSURE'
    };
    workflow.currentStage = stageMap[stage];

    await workflow.save();

    const signalement = await Signalement.findById(workflow.signalement).select('village');

    emitEvent('workflow.stageCompleted', {
      id: workflow._id,
      signalement: workflow.signalement,
      stage,
      village: signalement?.village
    });

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Generate DPE report with AI (placeholder)
export const generateDPEReport = async (req, res) => {
  try {
    const { workflowId } = req.params;

    const workflow = await Workflow.findById(workflowId).populate('signalement');
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // AI placeholder - would integrate with local AI model
    const aiGeneratedReport = `
RAPPORT DPE - Généré automatiquement

Signalement: ${workflow.signalement.title}
Type d'incident: ${workflow.signalement.incidentType}
Urgence: ${workflow.signalement.urgencyLevel}

Description de l'incident:
${workflow.signalement.description}

Analyse préliminaire:
[À compléter par le psychologue]

Recommandations:
[À compléter par le psychologue]

Actions immédiates:
[À compléter par le psychologue]

Note: Ce rapport a été généré automatiquement et doit être révisé et complété par un professionnel qualifié.
    `.trim();

    workflow.stages.dpeReport.content = aiGeneratedReport;
    workflow.stages.dpeReport.aiGenerated = true;
    await workflow.save();

    emitEvent('workflow.dpeGenerated', {
      id: workflow._id,
      signalement: workflow.signalement?._id || workflow.signalement,
      village: workflow.signalement?.village
    });

    res.json({ 
      message: 'DPE report generated',
      content: aiGeneratedReport,
      workflow 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Classify signalement
export const classifySignalement = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { classification } = req.body;

    const workflow = await Workflow.findById(workflowId).populate('signalement');
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    const validClassifications = ['SAUVEGARDE', 'PRISE_EN_CHARGE', 'FAUX_SIGNALEMENT'];
    if (!validClassifications.includes(classification)) {
      return res.status(400).json({ message: 'Invalid classification' });
    }

    workflow.classification = classification;
    await workflow.save();

    // Update signalement
    const signalement = await Signalement.findById(workflow.signalement._id);
    signalement.classification = classification;
    signalement.classifiedBy = req.user.id;
    signalement.classifiedAt = new Date();
    
    if (classification === 'FAUX_SIGNALEMENT') {
      signalement.status = 'FAUX_SIGNALEMENT';
    }

    await signalement.save();

    emitEvent('signalement.classified', {
      id: signalement._id,
      classification,
      village: signalement.village
    });

    res.json({ workflow, signalement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add note to workflow
export const addWorkflowNote = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { content } = req.body;

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    workflow.notes.push({
      content,
      createdBy: req.user.id,
      createdAt: new Date()
    });

    await workflow.save();

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Escalate signalement to Level 3
export const escalateSignalement = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { escalatedTo } = req.body;

    const validTargets = ['VILLAGE_DIRECTOR', 'NATIONAL_OFFICE'];
    if (!validTargets.includes(escalatedTo)) {
      return res.status(400).json({ message: 'Invalid escalatedTo value' });
    }

    const workflow = await Workflow.findById(workflowId).populate('signalement');
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Require classification before escalation
    if (!workflow.classification) {
      return res.status(400).json({
        message: 'Cannot escalate before classification. Classify the signalement first.'
      });
    }

    const signalement = await Signalement.findById(workflow.signalement._id);
    signalement.escalationStatus = 'ESCALATED';
    signalement.escalatedTo = escalatedTo;
    signalement.escalatedBy = req.user.id;
    signalement.escalatedAt = new Date();
    await signalement.save();

    emitEvent('signalement.escalated', {
      id: signalement._id,
      escalatedTo,
      village: signalement.village
    });

    res.json({ workflow, signalement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all workflows (Level 2 dashboard - only assigned workflows)
export const getMyWorkflows = async (req, res) => {
  try {
    // Level 2 can only see workflows assigned to them
    if (req.user.role === 'LEVEL2') {
      const workflows = await Workflow.find({ 
        assignedTo: req.user.id,
        status: 'ACTIVE'
      })
        .populate('signalement')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      res.json(workflows);
    } else if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      // Level 3/4 can view all workflows but with read-only indicator
      const workflows = await Workflow.find({ status: 'ACTIVE' })
        .populate('signalement')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      const workflowsWithPermissions = workflows.map(w => ({
        ...w.toObject(),
        readOnly: true,
        canEdit: false,
        allowedActions: ['view', 'closure-decision']
      }));

      res.json(workflowsWithPermissions);
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
