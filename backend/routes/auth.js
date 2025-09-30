// /backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

import User from '../models/user.js';
import generateCode from '../utils/generateCode.js';
import { sendEmail } from '../utils/gmail.js';

const router = express.Router();

/* ================= Google OAuth Strategy ================= */
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URI,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0]?.value?.toLowerCase();
      const googleId = profile.id;
      const picture = profile.photos && profile.photos[0]?.value;

      let user = await User.findOne({ $or: [{ googleId }, { email }] });
      if (!user) {
        user = await User.create({
          email,
          googleId,
          profilePicture: picture || '/images/user.png',
        });
      } else {
        // อัปเดตรูปครั้งแรกถ้ายังไม่มี
        if (!user.profilePicture && picture) {
          user.profilePicture = picture;
          await user.save();
        }
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

/* ================= Helpers ================= */
function issueCookieAndJson(res, token, role, maxDays = 7) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxDays * 24 * 60 * 60 * 1000,
  });
  // ส่ง token กลับด้วยเพื่อเก็บใน localStorage (กัน third-party cookies)
  res.json({ message: 'OK', role, token });
}

function requirePre(req, res, next) {
  try {
    const bearer = req.headers.authorization || '';
    const headerToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.stage !== 'pre') return res.status(401).json({ message: 'Unauthorized' });
    req.preUserId = payload.id;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

/* ================= Register (step 1) ================= */
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const lower = String(email).toLowerCase();

    const exists = await User.findOne({ email: lower });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const code = generateCode(); // 6 digits
    const hash = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.create({
      email: lower,
      verificationCode: hash,
      verificationCodeExpires: expires,
    });

    const html = `<h2>Verify your email</h2>
      <p>Your verification code is <b style="font-size:18px;">${code}</b></p>
      <p>This code will expire in 10 minutes.</p>`;

    try { await sendEmail(lower, 'ProjectMongo · Email Verification', html); } catch {}

    res.json({ message: 'Verification code sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ================= Verify email (step 2 → pre token) ================= */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body || {};
    const lower = String(email || '').toLowerCase();
    const user = await User.findOne({ email: lower });
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

/* ================= Complete registration (step 3) ================= */
router.post('/complete-registration', requirePre, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await User.findById(req.preUserId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (username) user.username = username;
    if (password) user.password = password;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    issueCookieAndJson(res, token, user.role, 7);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ================= Google OAuth ================= */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  async (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    // ตั้งคุกกี้
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // redirect กลับ frontend พร้อม token ใน hash
    const front = process.env.FRONTEND_URL || '';
    const target = !user.username
      ? '/form.html?source=google#token=' + token
      : '/home.html#token=' + token;

    res.redirect(front + target);
  }
);

/* ================= Login ================= */
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};
    const lower = String(email || '').toLowerCase();
    const user = await User.findOne({ email: lower });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const expiresIn = rememberMe ? '30d' : '7d';
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn });

    const days = rememberMe ? 30 : 7;
    issueCookieAndJson(res, token, user.role, days);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/* ================= Forgot / Reset password ================= */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const lower = String(email || '').toLowerCase();
    const user = await User.findOne({ email: lower });
    if (!user) return res.json({ message: 'If exists, email sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const hash = await bcrypt.hash(token, 10);
    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const link = `${process.env.FRONTEND_URL}/reset.html?token=${encodeURIComponent(token)}`;
    const html = `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`;
    try { await sendEmail(user.email, 'Reset Password', html); } catch {}
    res.json({ message: 'If exists, email sent' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body || {};
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

/* ================= Logout ================= */
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' };
  res.clearCookie('token', opts);
  res.cookie('token', '', { ...opts, expires: new Date(0) });
  res.json({ message: 'Logged out' });
});

export default router;
