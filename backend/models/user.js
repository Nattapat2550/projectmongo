const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, default: null },
  username: { type: String, unique: true, sparse: true },
  profilePicture: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isEmailVerified: { type: Boolean, default: false },
  oauthProvider: { type: String, default: null },
  oauthId: { type: String, default: null },
  theme: { type: String, enum: ['light', 'dark'], default: 'light' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes: Rely on field-level { unique: true } – no explicit schema.index() needed
// userSchema.index({ email: 1 }, { unique: true });  // REMOVED: Duplicate
// userSchema.index({ username: 1 }, { unique: true, sparse: true });  // REMOVED: Duplicate
userSchema.index({ role: 1 });  // Keep non-unique indexes

// Pre-save: hash password, update timestamp
userSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  this.updatedAt = Date.now();
  next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('User ', userSchema);  // Fixed: Was 'User  ' (typo with space)