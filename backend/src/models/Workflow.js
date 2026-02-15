import mongoose from 'mongoose';

/* ─── Reusable sub-schemas ─── */
const attachmentSchema = {
  filename: String,
  originalName: String,
  mimeType: String,
  size: Number,
  path: String,
  uploadedAt: { type: Date, default: Date.now }
};

const stageSchema = {
  completed: { type: Boolean, default: false },
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  attachments: [attachmentSchema],
  dueAt: Date,
  isOverdue: { type: Boolean, default: false }
};

/* ─── Workflow — 6-stage document model ───
 *  Stage 1: ficheInitiale       (Fiche Initiale)        — 24 h deadline
 *  Stage 2: rapportDpe          (Rapport DPE – IA)      — AI-generated then validated
 *  Stage 3: evaluationComplete  (Évaluation Complète)   — 48 h after stage 2
 *  Stage 4: planAction          (Plan d'Action)          — 48 h after stage 3
 *  Stage 5: rapportSuivi        (Rapport de Suivi)       — 72 h after stage 4
 *  Stage 6: rapportFinal        (Rapport Final)          — 48 h after stage 5
 */
const workflowSchema = new mongoose.Schema({
  signalement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signalement',
    required: true,
    unique: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  classification: {
    type: String,
    enum: ['SAUVEGARDE', 'PRISE_EN_CHARGE', 'FAUX_SIGNALEMENT', null],
    default: null
  },

  /* ── Six-step document workflow ── */
  stages: {
    ficheInitiale:      stageSchema,
    rapportDpe:         stageSchema,
    evaluationComplete: stageSchema,
    planAction:         stageSchema,
    rapportSuivi:       stageSchema,
    rapportFinal:       stageSchema
  },

  /* Track whether DPE AI draft was generated */
  dpeGenerated: { type: Boolean, default: false },
  dpeGeneratedAt: Date,

  currentStage: {
    type: String,
    enum: [
      'FICHE_INITIALE',
      'RAPPORT_DPE',
      'EVALUATION_COMPLETE',
      'PLAN_ACTION',
      'RAPPORT_SUIVI',
      'RAPPORT_FINAL',
      'COMPLETED'
    ],
    default: 'FICHE_INITIALE'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'],
    default: 'ACTIVE'
  },

  /* ── Closure tracking ── */
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedAt: Date,
  closureReason: String,

  /* ── Penalty / overdue tracking ── */
  penalties: [{
    stage: String,
    dueAt: Date,
    completedAt: Date,
    delayHours: Number,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Workflow', workflowSchema);
