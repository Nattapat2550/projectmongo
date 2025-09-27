const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User ', required: true },
  code: { type: String, required: true, minlength: 6, maxlength: 6 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
verificationSchema.index({ userId: 1 });
verificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL

module.exports = mongoose.model('Verification', verificationSchema);