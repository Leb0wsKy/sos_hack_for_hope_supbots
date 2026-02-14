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

export default mongoose.model('User', userSchema);
