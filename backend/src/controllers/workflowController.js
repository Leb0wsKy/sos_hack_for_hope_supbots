import Workflow from '../models/Workflow.js';
import Signalement from '../models/Signalement.js';

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

    res.json(workflow);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update workflow stage
export const updateWorkflowStage = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { stage, content } = req.body;

    const workflow = await Workflow.findById(workflowId);
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

    // Update stage
    workflow.stages[stage].completed = true;
    workflow.stages[stage].completedAt = new Date();
    workflow.stages[stage].completedBy = req.user.id;
    workflow.stages[stage].content = content;

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

// Get all workflows (Level 2 dashboard)
export const getMyWorkflows = async (req, res) => {
  try {
    const workflows = await Workflow.find({ 
      assignedTo: req.user.id,
      status: 'ACTIVE'
    })
      .populate('signalement')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(workflows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
