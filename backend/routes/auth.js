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

/* Google OAuth Strategy */
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URI,
  },
  async (_at, _rt, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value?.toLowerCase();
      const googleId = profile.id;
      const picture = profile.photos?.[0]?.value;

      let user = await User.findOne({ $or: [{ googleId }, { email }] });
      if (!user) {
        user = await User.create({
          email,
          googleId,
          profilePicture: picture || '/images/user.png'
        });
      } else if (!user.profilePicture && picture) {
        user.profilePicture = picture;
        await user.save();
      }
      return done(null, user);
    } catch (e) {
      return done(e);
    }
  }
));

function setCookieAndReturn(res, token, role, days) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: days * 24 * 60 * 60 * 1000
  });
  res.json({ message: 'OK', role, token });
}

/* POST /register */
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const lower = String(email).toLowerCase();

    const exists = await User.findOne({ email: lower });
    if (exists) return res.status(409).json({ message: 'Email already registered' });

    const code = generateCode();
    const hash = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await User.create({
      email: lower,
      verificationCode: hash,
      verificationCodeExpires: expires
    });

    const html = `<h2>ProjectMongo Verification</h2>
      <p>Your code: <b style="font-size:18px">${code}</b></p>
      <p>Expires in 10 minutes.</p>`;
    try { await sendEmail(lower, 'Verify your email', html); } catch {}

    res.json({ message: 'Verification code sent' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* POST /verify-email */
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body || {};
    const lower = String(email||'').toLowerCase();
    const user = await User.findOne({ email: lower });
    if (!user || !user.verificationCode || !user.verificationCodeExpires) {
      return res.status(400).json({ message: 'Invalid request' });
    }
    if (user.verificationCodeExpires < new Date()) {
      return res.status(400).json({ message: 'Code expired' });
    }
    const ok = await bcrypt.compare(String(verificationCode||''), user.verificationCode);
    if (!ok) return res.status(400).json({ message: 'Invalid code' });

    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    const preToken = jwt.sign({ id: user._id, stage: 'pre' }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({ message: 'Email verified', token: preToken });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* POST /complete-registration */
function requirePre(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const headerToken = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.stage !== 'pre') return res.status(401).json({ message: 'Unauthorized' });
    req.preId = payload.id;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}
router.post('/complete-registration', requirePre, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await User.findById(req.preId);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    if (username) user.username = username;
    if (password) user.password = password;
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    setCookieAndReturn(res, token, user.role, 7);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* GET /google */
router.get('/google', passport.authenticate('google', { scope: ['profile','email'] }));

/* GET /google/callback */
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login.html' }),
  async (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('token', token, {
      httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/', maxAge: 7*24*60*60*1000
    });
    const front = process.env.FRONTEND_URL || '';
    const target = !user.username
      ? '/form.html?source=google#token=' + token
      : '/home.html#token=' + token;
    res.redirect(front + target);
  }
);

/* POST /login */
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body || {};
    const lower = String(email||'').toLowerCase();
    const user = await User.findOne({ email: lower });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const exp = rememberMe ? '30d' : '7d';
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: exp });
    const days = rememberMe ? 30 : 7;
    setCookieAndReturn(res, token, user.role, days);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const lower = String(email || '').toLowerCase();
    const user = await User.findOne({ email: lower });
    if (!user) return res.json({ message: 'If exists, email sent' });

    const token = crypto.randomBytes(32).toString('hex'); // hex ไม่ต้องกลัว encode
    const hash = await bcrypt.hash(token, 10);
    user.resetPasswordToken = hash;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 ชม.
    await user.save();

    const link = `${process.env.FRONTEND_URL}/reset.html?token=${encodeURIComponent(token)}`;
    const html = `<p>Reset your password:</p><p><a href="${link}">${link}</a></p>`;
    try { await sendEmail(user.email, 'Reset Password', html); } catch {}
    res.json({ message: 'If exists, email sent' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    // ยอมรับ token จาก query หรือ body (กันกรณี front ไม่ส่งมา)
    const tokenFromQuery = (req.query?.token || '').trim();
    const tokenFromBody  = (req.body?.token || '').trim();
    const token = tokenFromBody || tokenFromQuery;

    const newPassword     = (req.body?.newPassword || '').trim();
    const confirmPassword = (req.body?.confirmPassword || '').trim();

    if (!token) {
      return res.status(400).json({ message: 'Missing token' });
    }
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Missing password fields' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // ค้นหา user ที่ token ยังไม่หมดอายุ แล้วเทียบ bcrypt
    const candidates = await User.find({
      resetPasswordToken: { $ne: null },
      resetPasswordExpires: { $gt: new Date() }
    });

    let target = null;
    for (const u of candidates) {
      const ok = await bcrypt.compare(token, u.resetPasswordToken);
      if (ok) { target = u; break; }
    }

    if (!target) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    target.password = newPassword;
    target.resetPasswordToken = undefined;
    target.resetPasswordExpires = undefined;
    await target.save();

    res.json({ message: 'Password updated' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

/* POST /logout */
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  const opts = { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax', path: '/' };
  res.clearCookie('token', opts);
  res.cookie('token', '', { ...opts, expires: new Date(0) });
  res.json({ message: 'Logged out' });
});

export default router;
