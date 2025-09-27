const mongoose = require('mongoose');

const homepageSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes
homepageSchema.index({ slug: 1 }, { unique: true });

// Pre-save: update timestamp
homepageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Homepage', homepageSchema);