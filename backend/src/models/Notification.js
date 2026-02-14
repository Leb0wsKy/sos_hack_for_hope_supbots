import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification type
  type: {
    type: String,
    enum: [
      'SIGNALEMENT_NEW',
      'SIGNALEMENT_ASSIGNED',
      'SIGNALEMENT_CLASSIFIED',
      'SIGNALEMENT_ESCALATED',
      'SIGNALEMENT_CLOSED',
      'WORKFLOW_UPDATED',
      'DPE_GENERATED',
      'REPORT_SUBMITTED'
    ],
    required: true
  },
  
  // Related signalement
  signalement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Signalement',
    required: true
  },
  
  // Notification content
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Additional data (optional)
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  },
  
  // Priority
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  
  // Creator (who triggered the notification)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1 });

export default mongoose.model('Notification', notificationSchema);
