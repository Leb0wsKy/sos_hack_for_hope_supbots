import Workflow from '../models/Workflow.js';
import Signalement from '../models/Signalement.js';
import { emitEvent } from '../services/socket.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ═══════════════════════════════════════════════════════
   Workflow Controller — simplified 2-stage document flow
   Stage 1: initialReport  (Rapport Initial)  — 24 h
   Stage 2: finalReport    (Rapport Final)    — 48 h
   ═══════════════════════════════════════════════════════ */

// ------ Create workflow (called automatically by sauvegarder, or manually) ------
export const createWorkflow = async (req, res) => {
  try {
    const { signalementId } = req.body;

    const signalement = await Signalement.findById(signalementId);
    if (!signalement) {
      return res.status(404).json({ message: 'Signalement not found' });
    }

    const existingWorkflow = await Workflow.findOne({ signalement: signalementId });
    if (existingWorkflow) {
      return res.status(400).json({ message: 'Workflow already exists for this signalement' });
    }

    const now = new Date();
    const initialDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h

    const workflow = new Workflow({
      signalement: signalementId,
      assignedTo: req.user.id,
      stages: {
        initialReport: { dueAt: initialDeadline },
        finalReport: {}  // deadline set when step 1 completes
      }
    });

    await workflow.save();

    // Link workflow to signalement and mark EN_COURS
    signalement.workflow = workflow._id;
    signalement.assignedTo = req.user.id;
    signalement.assignedAt = now;
    signalement.status = 'EN_COURS';
    signalement.sauvegardedAt = now;
    signalement.deadlineAt = initialDeadline;
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

// ------ Get workflow by signalement ID ------
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

    const response = workflow.toObject();
    if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      response.readOnly = true;
      response.canEdit = false;
    } else if (req.user.role === 'LEVEL2') {
      const isAssigned = workflow.assignedTo &&
                         workflow.assignedTo._id.toString() === req.user.id;
      response.readOnly = !isAssigned;
      response.canEdit = isAssigned;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ------ Update workflow stage (2-stage sequential) ------
export const updateWorkflowStage = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { stage, content } = req.body;

    const workflow = req.workflow || await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Only 2 valid stages
    const validStages = ['initialReport', 'finalReport'];
    if (!validStages.includes(stage)) {
      return res.status(400).json({ message: 'Étape invalide. Seuls initialReport et finalReport sont acceptés.' });
    }

    // Sequential enforcement: can't do finalReport if initialReport not done
    if (stage === 'finalReport' && !workflow.stages.initialReport.completed) {
      return res.status(400).json({
        message: 'Impossible de valider le Rapport Final avant le Rapport Initial.',
        missingStage: 'initialReport'
      });
    }

    // Must have at least one file attachment to validate a stage
    if (!req.files?.length && (!workflow.stages[stage].attachments || workflow.stages[stage].attachments.length === 0)) {
      return res.status(400).json({
        message: 'Un document doit être téléversé pour valider cette étape.'
      });
    }

    const now = new Date();

    // Append uploaded files
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

    // Mark stage completed
    workflow.stages[stage].completed = true;
    workflow.stages[stage].completedAt = now;
    workflow.stages[stage].completedBy = req.user.id;
    if (content) workflow.stages[stage].content = content;

    // Check overdue and record penalty
    if (workflow.stages[stage].dueAt) {
      const isOverdue = now > workflow.stages[stage].dueAt;
      workflow.stages[stage].isOverdue = isOverdue;
      if (isOverdue) {
        const delayMs = now.getTime() - workflow.stages[stage].dueAt.getTime();
        const delayHours = Math.round((delayMs / (1000 * 60 * 60)) * 10) / 10;
        workflow.penalties.push({
          stage,
          dueAt: workflow.stages[stage].dueAt,
          completedAt: now,
          delayHours,
          userId: req.user.id
        });
      }
    }

    // Advance currentStage
    if (stage === 'initialReport') {
      // Set 48h deadline for finalReport
      const finalDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
      workflow.stages.finalReport.dueAt = finalDeadline;
      workflow.currentStage = 'FINAL_REPORT';

      // Update signalement deadline to reflect step 2
      const signalement = await Signalement.findById(workflow.signalement);
      if (signalement) {
        signalement.deadlineAt = finalDeadline;
        await signalement.save();
      }
    } else if (stage === 'finalReport') {
      workflow.currentStage = 'COMPLETED';
      workflow.status = 'COMPLETED';
    }

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

// ------ Download predefined template ------
export const downloadTemplate = async (req, res) => {
  try {
    const { templateName } = req.params;

    const templates = {
      'rapport-initial': 'rapport_initial_template.txt',
      'rapport-final': 'rapport_final_template.txt'
    };

    const filename = templates[templateName];
    if (!filename) {
      return res.status(400).json({ message: 'Template invalide. Utilisez rapport-initial ou rapport-final.' });
    }

    const filePath = path.join(__dirname, '../../templates', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier template introuvable.' });
    }

    res.download(filePath, filename);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ------ Classify signalement ------
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

// ------ Add note to workflow ------
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

// ------ Escalate signalement to Level 3 ------
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

    if (!workflow.classification) {
      return res.status(400).json({
        message: 'Cannot escalate before classification.'
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

// ------ Get my workflows (dashboard) ------
export const getMyWorkflows = async (req, res) => {
  try {
    if (req.user.role === 'LEVEL2') {
      const workflows = await Workflow.find({
        assignedTo: req.user.id
      })
        .populate('signalement')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      // Attach live deadline info
      const enriched = workflows.map(w => {
        const obj = w.toObject();
        const now = Date.now();

        for (const key of ['initialReport', 'finalReport']) {
          const stage = obj.stages?.[key];
          if (stage?.dueAt && !stage.completed) {
            const remaining = new Date(stage.dueAt).getTime() - now;
            stage.hoursRemaining = Math.round((remaining / (1000 * 60 * 60)) * 10) / 10;
            stage.isDeadlineExpired = remaining <= 0;
          }
        }
        return obj;
      });

      res.json(enriched);
    } else if (req.user.role === 'LEVEL3' || req.user.role === 'LEVEL4') {
      const workflows = await Workflow.find()
        .populate('signalement')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 });

      const withPerms = workflows.map(w => ({
        ...w.toObject(),
        readOnly: true,
        canEdit: false
      }));

      res.json(withPerms);
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
