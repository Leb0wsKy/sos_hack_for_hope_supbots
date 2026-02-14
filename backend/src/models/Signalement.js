import mongoose from 'mongoose';

const signalementSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  
  // Anonymous reporting
  isAnonymous: {
    type: Boolean,
    required: true,
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
    ref: 'Village'
  },
  program: {
    type: String
  },

  // People involved (optional)
  childName: {
    type: String
  },
  abuserName: {
    type: String
  },
  
  // Incident Details
  incidentType: {
    type: String,
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
  
  // Embedded Workflow (Level 2)
  workflow: {
    currentStep: {
      type: String,
      enum: [
        'FICHE_INITIALE_DPE',
        'EVALUATION_COMPLETE',
        'PLAN_ACTION',
        'RAPPORT_SUIVI',
        'RAPPORT_FINAL',
        'AVIS_CLOTURE'
      ],
      default: 'FICHE_INITIALE_DPE'
    },
    steps: [{
      step: {
        type: String,
        enum: [
          'FICHE_INITIALE_DPE',
          'EVALUATION_COMPLETE',
          'PLAN_ACTION',
          'RAPPORT_SUIVI',
          'RAPPORT_FINAL',
          'AVIS_CLOTURE'
        ],
        required: true
      },
      status: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'DONE'],
        default: 'NOT_STARTED'
      },
      dueAt: Date,
      startedAt: Date,
      completedAt: Date,
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    }]
  },
  
  // Assignment (Level 2)
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },

  // Escalation (Level 2 → Level 3)
  escalated: {
    type: Boolean,
    default: false
  },
  escalatedTo: [{
    type: String,
    enum: ['DIRECTEUR_VILLAGE', 'BUREAU_NATIONAL']
  }],
  escalatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  escalatedAt: {
    type: Date
  },
  escalationNote: {
    type: String
  },
  
  // Sauvegarde (Level 2 takes ownership)
  sauvegardedAt: {
    type: Date
  },
  deadlineAt: {
    type: Date
  },
  
  // Confidential Reports (Level 2)
  reports: {
    // DPE Draft (AI-generated)
    dpeDraft: {
      content: {
        titre: String,
        resume_signalement: String,
        contexte: String,
        observations: String,
        evaluation_risque: {
          niveau: {
            type: String,
            enum: ['faible', 'moyen', 'eleve']
          },
          justification: String
        },
        recommandations: [String],
        plan_action: [{
          action: String,
          responsable: String,
          delai: String
        }],
        suivi: String,
        points_a_verifier: [String],
        disclaimer: String
      },
      metadata: {
        generatedAt: Date,
        model: String,
        mode: {
          type: String,
          enum: ['ollama', 'template']
        },
        promptVersion: String,
        generatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        updatedAt: Date,
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    
    // DPE Final (submitted by psychologist)
    dpeFinal: {
      content: {
        titre: String,
        resume_signalement: String,
        contexte: String,
        observations: String,
        evaluation_risque: {
          niveau: {
            type: String,
            enum: ['faible', 'moyen', 'eleve']
          },
          justification: String
        },
        recommandations: [String],
        plan_action: [{
          action: String,
          responsable: String,
          delai: String
        }],
        suivi: String,
        points_a_verifier: [String],
        disclaimer: String
      },
      metadata: {
        submittedAt: Date,
        submittedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    
    // Evaluation Complete (stub for future use)
    evaluationComplete: {
      content: mongoose.Schema.Types.Mixed,
      metadata: {
        createdAt: Date,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    
    // Plan d'Action
    planAction: {
      content: mongoose.Schema.Types.Mixed,
      metadata: {
        createdAt: Date,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    
    // Rapport de Suivi
    suivi: {
      content: mongoose.Schema.Types.Mixed,
      metadata: {
        createdAt: Date,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    
    // Rapport Final
    final: {
      content: mongoose.Schema.Types.Mixed,
      metadata: {
        createdAt: Date,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    },
    
    // Avis de Clôture
    avisCloture: {
      content: mongoose.Schema.Types.Mixed,
      metadata: {
        createdAt: Date,
        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      }
    }
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
