const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  emailVerified: { type: Boolean, default: false },
  verificationCode: { type: String }, // 6-digit code
  codeExpires: { type: Date },
  username: { type: String, trim: true, default: null },
  password: { type: String }, // hashed
  photo: { type: String, default: '/images/user.png' }, // path or URL
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  resetToken: { type: String }, // JWT for reset
  resetTokenExp: { type: Date }, // optional
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook for updatedAt
UserSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Hash password before saving (for local auth)
UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.authProvider === 'local') {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('User ', UserSchema);