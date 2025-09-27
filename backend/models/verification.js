const mongoose = require('mongoose');

const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User ', required: true, index: true },  // Field-level index
  code: { type: String, required: true, minlength: 6, maxlength: 6 },
  expiresAt: { type: Date, required: true, expires: 600 },  // 10 min TTL (auto-index)
  createdAt: { type: Date, default: Date.now }
});

// No explicit schema.index() – field-level handles it

module.exports = mongoose.model('Verification', verificationSchema);