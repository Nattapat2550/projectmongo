const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const passport = require('passport'); // Assume passport-google-oauth20 setup if needed; simplified here
const User = require('../models/user');
const Verification = require('../models/verification');
const ResetToken = require('../models/resetToken');
const { generateCode, sendVerificationEmail, sendResetEmail } = require('../utils/gmail');
const crypto = require('crypto');
const { Session } = require('inspector'); // Not used; for session

const router = express.Router();

// Normalize email helper
const normalizeEmail = (email) => email.toLowerCase().trim();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    const normEmail = normalizeEmail(email);

    // Check if user exists
    let user = await User.findOne({ email: normEmail });
    if (user) return res.status(400).json({ error: 'Email already exists' });

    // Create user (passwordHash set pre-save)
    user = new User({ email: normEmail, password, username });
    await user.save();

    // Generate and send verification code (transaction)
    const session = await Verification.db.startSession();
    await session.withTransaction(async () => {
      // Delete old codes
      await Verification.deleteMany({ userId: user._id }, { session });
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
      await new Verification({ userId: user._id, code, expiresAt }).save({ session });
      await sendVerificationEmail(normEmail, code);
    });
    session.endSession();

    res.status(201).json({ message: 'User  registered. Check email for verification.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify email
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  const normEmail = normalizeEmail(email);

  try {
    const session = await Verification.db.startSession();
    await session.withTransaction(async () => {
      const verification = await Verification.findOne({ userId: { $in: await User.find({ email: normEmail }).select('_id') }, code, expiresAt: { $gt: new Date() } }).session(session);
      if (!verification) throw new Error('Invalid or expired code');

      await User.updateOne({ _id: verification.userId }, { isEmailVerified: true }, { session });
      await Verification.deleteMany({ userId: verification.userId }, { session });
    });
    session.endSession();

    res.json({ message: 'Email verified' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete profile (after verify)
router.post('/complete', async (req, res) => {
  // Assume auth via session/JWT; simplified
  const { username, theme } = req.body;
  // Update user...
  res.json({ message: 'Profile completed' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normEmail = normalizeEmail(email);

  try {
    const user = await User.findOne({ email: normEmail });
    if (!user || !await user.comparePassword(password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.isEmailVerified) return res.status(401).json({ error: 'Email not verified' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth callback (simplified; use passport in full impl)
router.get('/google/callback', async (req, res) => {
  // Handle Google token exchange...
  // Create/find user with oauthProvider='google', oauthId
  // Set passwordHash=null, isEmailVerified=true
  // Generate JWT
  res.redirect(`${process.env.FRONTEND_URL}?token=generated_token`);
});

// Forgot password
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  const normEmail = normalizeEmail(email);

  try {
    const user = await User.findOne({ email: normEmail });
    if (!user) return res.status(404).json({ error: 'User  not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await new ResetToken({ userId: user._id, token, expiresAt }).save();
    await sendResetEmail(normEmail, token);

    res.json({ message: 'Reset email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;

  try {
    const session = await ResetToken.db.startSession();
    await session.withTransaction(async () => {
      const resetToken = await ResetToken.findOne({ token, expiresAt: { $gt: new Date() }, used: false }).session(session);
      if (!resetToken) throw new Error('Invalid or expired token');

      const user = await User.findById(resetToken.userId).session(session);
      user.passwordHash = password; // Will hash pre-save
      await user.save({ session });

      resetToken.used = true;
      await resetToken.save({ session });
    });
    session.endSession();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;