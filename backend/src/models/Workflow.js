import mongoose from 'mongoose';

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
  // Workflow stages
  stages: {
    initialReport: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    },
    dpeReport: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      aiGenerated: { type: Boolean, default: false },
      edited: { type: Boolean, default: false },
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    },
    evaluation: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    },
    actionPlan: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    },
    followUpReport: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    },
    finalReport: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    },
    closureNotice: {
      completed: { type: Boolean, default: false },
      completedAt: Date,
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        path: String,
        uploadedAt: { type: Date, default: Date.now }
      }],
      dueAt: Date,
      isOverdue: { type: Boolean, default: false }
    }
  },
  currentStage: {
    type: String,
    enum: ['INITIAL', 'DPE', 'EVALUATION', 'ACTION_PLAN', 'FOLLOW_UP', 'FINAL_REPORT', 'CLOSURE', 'COMPLETED'],
    default: 'INITIAL'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'COMPLETED', 'ARCHIVED'],
    default: 'ACTIVE'
  },
  notes: [{
    content: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

export default mongoose.model('Workflow', workflowSchema);
