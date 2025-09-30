import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import User from '../models/user.js';
import generateCode from '../utils/generateCode.js';
import { sendEmail } from '../utils/gmail.js';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

const router = express.Router();

// ---------- Google OAuth Strategy ----------
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails && profile.emails[0]?.value?.toLowerCase();
    const googleId = profile.id;
    const picture = profile.photos && profile.photos[0]?.value;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (!user) {
      user = await User.create({
        email,
        googleId,
        profilePicture: picture || 'images/user.png',
      });
    } else {
      // Update picture if missing
      if (!user.profilePicture && picture) {
        user.profilePicture = picture;
        await user.save();
      }
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

router.post('/register', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.create({
      email: email.toLowerCase(),
      verificationCode: hash,
      verificationCodeExpires: expires,
    });

    const html = `<h2>ProjectMongo Verification</h2><p>Your code is <b>${code}</b>. It expires in 10 minutes.</p>`;
    try { await sendEmail(email, 'Verify your email', html); } catch (e) { /* allow fallback without email */ }

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    const user = await User.findOne({ email: (email||'').toLowerCase() });
    if (!user || !user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: 'Code expired' });
    }

    const ok = await bcrypt.compare(String(verificationCode || ''), user.verificationCode);
    if (!ok) return res.status(400).json({ message: 'Invalid code' });

    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const preToken = jwt.sign({ id: user._id, stage: 'pre' }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ message: 'Email verified', token: preToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

function requirePre(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.body.token || req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.stage !== 'pre') return res.status(401).json({ message: 'Unauthorized' });
    req.preUserId = payload.id;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

router.post('/complete-registration', requirePre, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findById(req.preUserId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (username) user.username = username;
    if (password) user.password = password;
    await user.save();

    const full = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', full, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ message: 'Registration completed', role: user.role, token: full });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  async (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // redirect to frontend with hash token (for SPA-like carry)
    const front = process.env.FRONTEND_URL || '/home.html';
    const redirectToForm = !user.username;
    const target = redirectToForm ? '/form.html?source=google#token=' + token : '/home.html#token=' + token;
    res.redirect(front + target);
  }
);

router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const user = await User.findOne({ email: (email||'').toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ message: 'Logged in', role: user.role, token });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: (email||'').toLowerCase() });
    if (!user) return res.json({ message: 'If exists, email sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);
    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const link = `${process.env.FRONTEND_URL}/reset.html?token=${encodeURIComponent(token)}`;
    const html = `<p>Reset your password: <a href="${link}">${link}</a></p>`;
    try { await sendEmail(user.email, 'Reset Password', html); } catch {}

    res.json({ message: 'If exists, email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token || !newPassword || newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    const users = await User.find({ resetPasswordToken: { $ne: null } });
    let target = null;
    for (const u of users) {
      if (u.resetPasswordExpires && u.resetPasswordExpires < new Date()) continue;
      const ok = await bcrypt.compare(token, u.resetPasswordToken);
      if (ok) { target = u; break; }
    }
    if (!target) return res.status(400).json({ message: 'Invalid or expired token' });
    target.password = newPassword;
    target.resetPasswordToken = undefined;
    target.resetPasswordExpires = undefined;
    await target.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  res.json({ message: 'Logged out' });
});

export default router;
