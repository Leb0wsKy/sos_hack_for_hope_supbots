import Workflow from '../models/Workflow.js';
import Signalement from '../models/Signalement.js';
import User from '../models/User.js';
import { emitEvent } from '../services/socket.js';
import { notifyDocumentToSign, notifySignalementStatusChanged } from '../services/emailService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ═══════════════════════════════════════════════════════
   Workflow Controller — 6-stage document flow
   1. ficheInitiale       — 24 h
   2. rapportDpe          — AI-generated
   3. evaluationComplete  — 48 h
   4. planAction          — 48 h
   5. rapportSuivi        — 72 h
   6. rapportFinal        — 48 h
   ═══════════════════════════════════════════════════════ */

/** Ordered list of stages with their deadlines (hours after previous stage) */
const STAGE_SEQUENCE = [
  { key: 'ficheInitiale',      enum: 'FICHE_INITIALE',      deadlineHours: 24 },
  { key: 'rapportDpe',         enum: 'RAPPORT_DPE',         deadlineHours: 24 },
  { key: 'evaluationComplete', enum: 'EVALUATION_COMPLETE', deadlineHours: 48 },
  { key: 'planAction',         enum: 'PLAN_ACTION',         deadlineHours: 48 },
  { key: 'rapportSuivi',       enum: 'RAPPORT_SUIVI',       deadlineHours: 72 },
  { key: 'rapportFinal',       enum: 'RAPPORT_FINAL',       deadlineHours: 48 },
];

/** Get the index of a stage key in the sequence (0-based). Returns -1 if invalid. */
const stageIndex = (key) => STAGE_SEQUENCE.findIndex((s) => s.key === key);

/** Check that all prerequisite stages are completed */
const prerequisitesMet = (workflow, stageKey) => {
  const idx = stageIndex(stageKey);
  if (idx <= 0) return true; // first stage has no prerequisites
  for (let i = 0; i < idx; i++) {
    if (!workflow.stages[STAGE_SEQUENCE[i].key]?.completed) return false;
  }
  return true;
};

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
        ficheInitiale:      { dueAt: initialDeadline },
        rapportDpe:         {},
        evaluationComplete: {},
        planAction:         {},
        rapportSuivi:       {},
        rapportFinal:       {}
      }
    });

    await workflow.save();

    // Link workflow to signalement and mark EN_COURS
    signalement.workflowRef = workflow._id;
    signalement.assignedTo = req.user.id;
    signalement.assignedAt = now;
    signalement.status = 'EN_COURS';
    signalement.sauvegardedAt = signalement.sauvegardedAt || now;
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

// ------ Update workflow stage (6-stage sequential) ------
export const updateWorkflowStage = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { stage, content } = req.body;

    const workflow = req.workflow || await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Validate stage key
    const validStages = STAGE_SEQUENCE.map((s) => s.key);
    if (!validStages.includes(stage)) {
      return res.status(400).json({
        message: `Étape invalide. Étapes valides : ${validStages.join(', ')}`,
        validStages
      });
    }

    // Sequential enforcement: all prior stages must be completed
    if (!prerequisitesMet(workflow, stage)) {
      const idx = stageIndex(stage);
      const missing = [];
      for (let i = 0; i < idx; i++) {
        if (!workflow.stages[STAGE_SEQUENCE[i].key]?.completed) {
          missing.push(STAGE_SEQUENCE[i].key);
        }
      }
      return res.status(400).json({
        message: `Impossible de valider cette étape. Étapes manquantes : ${missing.join(', ')}`,
        missingStages: missing
      });
    }

    // For rapportDpe, require that DPE AI draft was generated first
    if (stage === 'rapportDpe' && !workflow.dpeGenerated) {
      return res.status(400).json({
        message: 'Le rapport DPE doit d\'abord être généré par l\'IA avant de valider cette étape.',
        hint: 'Utilisez POST /api/dpe/:id/generate pour générer le rapport DPE.'
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

    // Advance currentStage to the next uncompleted stage
    const currentIdx = stageIndex(stage);
    if (currentIdx < STAGE_SEQUENCE.length - 1) {
      const nextStageDef = STAGE_SEQUENCE[currentIdx + 1];
      workflow.currentStage = nextStageDef.enum;

      // Set deadline for next stage
      const nextDeadline = new Date(now.getTime() + nextStageDef.deadlineHours * 60 * 60 * 1000);
      workflow.stages[nextStageDef.key].dueAt = nextDeadline;

      // Update signalement deadline to reflect next step
      const signalement = await Signalement.findById(workflow.signalement);
      if (signalement) {
        signalement.deadlineAt = nextDeadline;
        await signalement.save();
      }
    } else {
      // All 6 stages done — mark workflow ready for closure (not auto-closed)
      workflow.currentStage = 'COMPLETED';
    }

    await workflow.save();

    const signalement = await Signalement.findById(workflow.signalement).select('village');
    emitEvent('workflow.stageCompleted', {
      id: workflow._id,
      signalement: workflow.signalement,
      stage,
      completedStages: STAGE_SEQUENCE.filter((s) => workflow.stages[s.key]?.completed).length,
      totalStages: STAGE_SEQUENCE.length,
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
      'fiche-initiale':       'rapport_initial_template.docx',
      'rapport-dpe':          'rapport_dpe_template.docx',
      'evaluation-complete':  'evaluation_complete_template.docx',
      'plan-action':          'plan_action_template.docx',
      'rapport-suivi':        'rapport_suivi_template.docx',
      'rapport-final':        'rapport_final_template.docx',
      // Keep backward compat
      'rapport-initial':      'rapport_initial_template.docx',
    };

    const filename = templates[templateName];
    if (!filename) {
      return res.status(400).json({
        message: `Template invalide. Templates disponibles : ${Object.keys(templates).join(', ')}`
      });
    }

    const filePath = path.join(__dirname, '../../templates', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier template introuvable.' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
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

    const signalement = await Signalement.findById(workflow.signalement._id);
    signalement.classification = classification;
    signalement.classifiedBy = req.user.id;
    signalement.classifiedAt = new Date();

    const now = new Date();

    if (classification === 'SAUVEGARDE') {
      // Full 6-step workflow continues — nothing extra to do
    } else if (classification === 'PRISE_EN_CHARGE') {
      // Acknowledged / minor — no workflow treatment needed
      workflow.status = 'COMPLETED';
      workflow.currentStage = 'COMPLETED';
      workflow.closedBy = req.user.id;
      workflow.closedAt = now;
      workflow.closureReason = 'Prise en charge — signalement mineur, pas de workflow requis.';
      signalement.status = 'CLOTURE';
      signalement.closedBy = req.user.id;
      signalement.closedAt = now;
      signalement.closureReason = 'Prise en charge — traitement direct sans workflow.';
    } else if (classification === 'FAUX_SIGNALEMENT') {
      // Fake report — archive workflow, mark signalement
      workflow.status = 'ARCHIVED';
      workflow.currentStage = 'COMPLETED';
      workflow.closedBy = req.user.id;
      workflow.closedAt = now;
      workflow.closureReason = 'Faux signalement identifié.';
      signalement.status = 'FAUX_SIGNALEMENT';
      signalement.closedBy = req.user.id;
      signalement.closedAt = now;
      signalement.closureReason = 'Faux signalement identifié par le psychologue.';
    }

    await workflow.save();
    await signalement.save();

    // Notify Level 1 creator for prise en charge / faux
    if (classification !== 'SAUVEGARDE') {
      emitEvent('signalement.closed', {
        id: signalement._id,
        closedBy: req.user.id,
        classification,
        village: signalement.village,
        createdBy: signalement.createdBy
      });

      // Email Level 1 creator about status change
      if (signalement.createdBy) {
        User.findById(signalement.createdBy).select('email name').then(creator => {
          if (creator) {
            notifySignalementStatusChanged({
              email: creator.email,
              name: creator.name,
              signalementTitle: signalement.title,
              oldStatus: 'EN_COURS',
              newStatus: signalement.status,
              signalementId: signalement._id
            }).catch(err => console.error('Email notification error:', err.message));
          }
        }).catch(err => console.error('Email notification lookup error:', err.message));
      }
    }

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

        for (const { key } of STAGE_SEQUENCE) {
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

// ------ Mark DPE as generated (called after AI generates DPE) ------
export const markDpeGenerated = async (req, res) => {
  try {
    const { workflowId } = req.params;

    const workflow = req.workflow || await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    workflow.dpeGenerated = true;
    workflow.dpeGeneratedAt = new Date();
    await workflow.save();

    res.json({ success: true, message: 'DPE marqué comme généré', workflow });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ------ Close workflow (all 6 stages must be done) ------
export const closeWorkflow = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { reason } = req.body;

    const workflow = req.workflow || await Workflow.findById(workflowId);
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // Verify ALL 6 stages are completed
    const incomplete = STAGE_SEQUENCE.filter((s) => !workflow.stages[s.key]?.completed);
    if (incomplete.length > 0) {
      return res.status(400).json({
        message: `Impossible de clôturer. Étapes non terminées : ${incomplete.map(s => s.key).join(', ')}`,
        incompleteStages: incomplete.map(s => s.key)
      });
    }

    const now = new Date();
    workflow.status = 'COMPLETED';
    workflow.currentStage = 'COMPLETED';
    workflow.closedBy = req.user.id;
    workflow.closedAt = now;
    workflow.closureReason = reason || 'Toutes les étapes complétées';
    await workflow.save();

    // Submit dossier to Director Village for signature (do NOT close)
    const signalement = await Signalement.findById(workflow.signalement);
    if (signalement) {
      // Mark as ready for Director Village signature
      if (!signalement.directorReviewStatus) {
        signalement.directorReviewStatus = 'PENDING';
      }
      await signalement.save();

      // Notify Director Village that a dossier is ready
      emitEvent('dossier.readyForDirector', {
        id: signalement._id,
        village: signalement.village,
        submittedBy: req.user.id
      });

      // Email Level 3 Village Directors to sign the documents
      if (signalement.village) {
        User.find({
          role: 'LEVEL3',
          roleDetails: 'VILLAGE_DIRECTOR',
          village: signalement.village,
          isActive: true
        }).select('email name').then(async (directors) => {
          // If no village-scoped director, find all directors
          const targets = directors.length > 0 ? directors :
            await User.find({ role: 'LEVEL3', roleDetails: 'VILLAGE_DIRECTOR', isActive: true }).select('email name');
          const villageName = signalement.village?.name || 'Village';
          targets.forEach(d => {
            notifyDocumentToSign({
              email: d.email,
              name: d.name,
              signalementTitle: signalement.title,
              signalementId: signalement._id,
              villageName,
              submittedByName: req.user.name
            }).catch(err => console.error('Email notification error:', err.message));
          });
        }).catch(err => console.error('Email notification lookup error:', err.message));
      }
    }

    res.json({ success: true, message: 'Dossier soumis au Directeur Village pour signature.', workflow });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/* ══════════════════════════════════════════════════════
   Download workflow stage attachment
   (Accessible by Director Village + National + SuperAdmin)
   ══════════════════════════════════════════════════════ */
export const downloadWorkflowAttachment = async (req, res) => {
  try {
    const { workflowId, stage, filename } = req.params;
    const workflow = await Workflow.findById(workflowId).populate('signalement');
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    const validStages = ['ficheInitiale', 'rapportDpe', 'evaluationComplete', 'planAction', 'rapportSuivi', 'rapportFinal'];
    if (!validStages.includes(stage)) return res.status(400).json({ message: 'Invalid stage' });

    const stageData = workflow.stages?.[stage];
    if (!stageData) return res.status(404).json({ message: 'Stage not found' });

    const attachment = stageData.attachments?.find(a => a.filename === filename);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found in this stage' });

    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found on server' });

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName || filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
