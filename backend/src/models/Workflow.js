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

/* ─── Workflow — simplified 2-stage model ───
 *  Stage 1: initialReport  (Rapport Initial)  — 24 h deadline from sauvegarder
 *  Stage 2: finalReport    (Rapport Final)    — 48 h deadline from step-1 completion
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

  /* ── Two-step document workflow ── */
  stages: {
    initialReport: stageSchema,
    finalReport: stageSchema
  },

  currentStage: {
    type: String,
    enum: ['INITIAL', 'FINAL_REPORT', 'COMPLETED'],
    default: 'INITIAL'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'],
    default: 'ACTIVE'
  },

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
