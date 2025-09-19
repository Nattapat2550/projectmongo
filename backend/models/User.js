const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: { type: String },
  profilePicture: { type: String, default: 'user.png' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User ', userSchema);