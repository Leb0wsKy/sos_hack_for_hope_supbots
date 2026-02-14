import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'VIEW_USERS',
      'CREATE_USER',
      'UPDATE_USER',
      'RESET_PASSWORD',
      'CREATE_SIGNALEMENT',
      'UPDATE_SIGNALEMENT',
      'DELETE_SIGNALEMENT',
      'CLASSIFY_SIGNALEMENT',
      'CLOSE_SIGNALEMENT',
      'VIEW_SIGNALEMENT',
      'CREATE_WORKFLOW',
      'UPDATE_WORKFLOW',
      'GENERATE_REPORT',
      'LOGIN',
      'LOGOUT',
      'CREATE_VILLAGE',
      'UPDATE_VILLAGE',
      'ACCESS_ANALYTICS',
      'EXPORT_DATA'
    ]
  },
  targetModel: {
    type: String,
    enum: ['User', 'Signalement', 'Workflow', 'Village', 'Analytics']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
