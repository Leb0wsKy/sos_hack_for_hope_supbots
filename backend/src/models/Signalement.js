import mongoose from 'mongoose';

const signalementSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Anonymous reporting
  isAnonymous: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Location & Village
  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village',
    required: true
  },
  program: {
    type: String,
    required: true
  },
  
  // Incident Details
  incidentType: {
    type: String,
    required: true,
    enum: [
      'SANTE',           // Health
      'VIOLENCE_PHYSIQUE',
      'VIOLENCE_PSYCHOLOGIQUE',
      'VIOLENCE_SEXUELLE',
      'NEGLIGENCE',
      'COMPORTEMENT',    // Behavior
      'EDUCATION',
      'FAMILIAL',        // Family issues
      'AUTRE'
    ]
  },
  
  // Urgency Level
  urgencyLevel: {
    type: String,
    required: true,
    enum: ['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'],
    default: 'MOYEN'
  },
  
  // Status Lifecycle
  status: {
    type: String,
    enum: ['EN_ATTENTE', 'EN_COURS', 'CLOTURE', 'FAUX_SIGNALEMENT'],
    default: 'EN_ATTENTE'
  },
  
  // Classification (by Level 2)
  classification: {
    type: String,
    enum: ['SAUVEGARDE', 'PRISE_EN_CHARGE', 'FAUX_SIGNALEMENT', null],
    default: null
  },
  classifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  classifiedAt: {
    type: Date
  },
  
  // Attachments (photo/audio/video)
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    path: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // AI Detection
  aiSuspicionScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  aiFlags: [{
    flag: String,
    confidence: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  // Workflow reference
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  
  // Assignment (Level 2)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  
  // Sauvegarde (Level 2 takes ownership)
  sauvegardedAt: {
    type: Date
  },
  deadlineAt: {
    type: Date
  },
  
  // Closure
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  closedAt: {
    type: Date
  },
  closureReason: {
    type: String
  },
  
  // Archived by Level 3
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  archivedAt: {
    type: Date
  }
}, {
  timestamps: true
});

export default mongoose.model('Signalement', signalementSchema);
