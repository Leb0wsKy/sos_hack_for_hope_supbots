import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['LEVEL1', 'LEVEL2', 'LEVEL3', 'LEVEL4'],
    default: 'LEVEL1'
  },
  // Role details
  roleDetails: {
    type: String,
    enum: [
      'SOS_MOTHER',
      'EDUCATOR', 
      'FIELD_STAFF',
      'PSYCHOLOGIST',
      'SOCIAL_WORKER',
      'VILLAGE_DIRECTOR',
      'NATIONAL_OFFICE',
      'SUPER_ADMIN'
    ]
  },
  // Village assignment
  village: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  },
  // For Level 3 users - can access multiple villages
  accessibleVillages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Village'
  }],
  phone: {
    type: String
  },
  // Number of children in charge (for SOS Mothers, Educators, etc.)
  childrenCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Temporary role override granted by super admin
  temporaryRole: {
    role: {
      type: String,
      enum: ['LEVEL1', 'LEVEL2', 'LEVEL3', 'LEVEL4']
    },
    roleDetails: {
      type: String,
      enum: [
        'SOS_MOTHER', 'EDUCATOR', 'FIELD_STAFF',
        'PSYCHOLOGIST', 'SOCIAL_WORKER', 'VILLAGE_DIRECTOR',
        'NATIONAL_OFFICE', 'SUPER_ADMIN'
      ]
    },
    expiresAt: {
      type: Date,
      default: null  // null = manual removal only
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grantedAt: {
      type: Date
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get effective role (considers temporary role)
userSchema.methods.getEffectiveRole = function() {
  if (this.temporaryRole && this.temporaryRole.role) {
    // Check if expired
    if (this.temporaryRole.expiresAt && new Date() > this.temporaryRole.expiresAt) {
      return { role: this.role, roleDetails: this.roleDetails, isTemporary: false };
    }
    return {
      role: this.temporaryRole.role,
      roleDetails: this.temporaryRole.roleDetails || this.roleDetails,
      isTemporary: true,
      expiresAt: this.temporaryRole.expiresAt
    };
  }
  return { role: this.role, roleDetails: this.roleDetails, isTemporary: false };
};

export default mongoose.model('User', userSchema);
