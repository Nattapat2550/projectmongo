// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const User = require('../models/user');
const generateCode = require('../utils/generateCode');
const { sendEmail } = require('../utils/gmail');
const { setAuthCookie, clearAuthCookie } = require('../middleware/auth');

const router = express.Router();

// ---------------------
// Helpers
// ---------------------

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sanitizeUser(user) {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.verificationCode;
  delete obj.verificationCodeExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
}

// ---------------------
// REGISTER STEP 1: send code
// POST /api/auth/register
// body: { email }
// ---------------------
router.post('/register', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user && user.isEmailVerified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        role: 'user',
        isEmailVerified: false,
      });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 นาที

    user.verificationCode = code;
    user.verificationCodeExpires = expiresAt;
    await user.save();

    // ส่งอีเมล (ใช้ Gmail API util เดิม)
    await sendEmail({
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <b>${code}</b></p>`,
    });

    res.status(201).json({ ok: true });
  } catch (e) {
    console.error('register error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------
// REGISTER STEP 2: verify code
// POST /api/auth/verify-code
// body: { email, code }
// ---------------------
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ error: 'Missing email or code' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();

    if (
      !user.verificationCode ||
      !user.verificationCodeExpires ||
      user.verificationCode !== code ||
      user.verificationCodeExpires <= now
    ) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('verify-code error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------
// REGISTER STEP 3: complete profile
// POST /api/auth/complete-profile
// body: { email, username, password }
// ---------------------
router.post('/complete-profile', async (req, res) => {
  try {
    const { email, username, password } = req.body || {};
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (username.length < 3) {
      return res.status(400).json({ error: 'Username too short' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password too short' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isEmailVerified) {
      return res.status(401).json({ error: 'Email not verified' });
    }

    user.username = username;
    user.password = password; // pre-save hook จะ hash ให้
    await user.save();

    const token = signToken(user);
    setAuthCookie(res, token, true);

    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (e) {
    console.error('complete-profile error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------
// LOGIN (email/password)
// POST /api/auth/login
// body: { email, password, remember }
// ---------------------
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase() });

    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    setAuthCookie(res, token, !!remember);

    res.json({ ok: true, user: sanitizeUser(user) });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------
// LOGOUT
// POST /api/auth/logout
// ---------------------
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// ---------------------
// FORGOT / RESET PASSWORD
// ---------------------

// POST /api/auth/forgot-password
// body: { email }
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    const rawToken =
      uuidv4().replace(/-/g, '') + uuidv4().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 นาที
    const hashed = hashToken(rawToken);

    if (user) {
      user.resetPasswordToken = hashed;
      user.resetPasswordExpires = expiresAt;
      await user.save();

      const link = `${process.env.FRONTEND_URL}/reset.html?token=${rawToken}`;
      await sendEmail({
        to: email,
        subject: 'Password reset',
        text: `Reset your password using this link (valid 30 minutes): ${link}`,
        html: `<p>Reset your password (valid 30 minutes): <a href="${link}">${link}</a></p>`,
      });
    }

    // ไม่บอกว่า email นี้มี user หรือไม่ (กัน enumeration)
    res.json({ ok: true });
  } catch (e) {
    console.error('forgot-password error', e);
    res.json({ ok: true });
  }
});

// POST /api/auth/reset-password
// body: { token, newPassword }
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password too short' });
    }

    const hashed = hashToken(token);
    const now = new Date();

    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: now },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    user.password = newPassword; // pre-save จะ hash ใหม่
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ ok: true });
  } catch (e) {
    console.error('reset-password error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---------------------
// GOOGLE OAUTH (WEB FLOW)
// ---------------------

const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID_WEB || process.env.GOOGLE_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_CLIENT_ID_ANDROID;

const oauth2ClientWeb = new google.auth.OAuth2(
  GOOGLE_WEB_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URI
);

// เริ่ม OAuth บนเว็บ
// GET /api/auth/google
router.get('/google', (req, res) => {
  const url = oauth2ClientWeb.generateAuthUrl({
    redirect_uri: process.env.GOOGLE_CALLBACK_URI,
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
  });
  res.redirect(url);
});

// callback จาก Google (เว็บ)
// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;

    const { tokens } = await oauth2ClientWeb.getToken({
      code,
      redirect_uri: process.env.GOOGLE_CALLBACK_URI,
    });
    oauth2ClientWeb.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2ClientWeb,
      version: 'v2',
    });

    const { data: profile } = await oauth2.userinfo.get();

    const email = profile.email && profile.email.toLowerCase();
    const oauthId = profile.id;
    const picture = profile.picture;
    const name = profile.name || (email ? email.split('@')[0] : 'User');

    if (!email) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login.html?error=oauth_no_email`
      );
    }

    // หา / สร้าง user สำหรับ Google
    let user = await User.findOne({ googleId: oauthId });
    if (!user) {
      user = await User.findOne({ email });
    }

    if (user) {
      user.googleId = oauthId;
      user.isEmailVerified = true;
      if (picture && !user.profilePicture) {
        user.profilePicture = picture;
      }
      if (!user.username) {
        user.username = name;
      }
      await user.save();
    } else {
      user = new User({
        email,
        googleId: oauthId,
        isEmailVerified: true,
        profilePicture: picture || '',
        username: name,
        role: 'user',
      });
      await user.save();
    }

    const token = signToken(user);
    setAuthCookie(res, token, true);

    // 🔧 ตรงนี้สำคัญ: redirect ไปหน้า HTML เดิม (ไม่ใช่ /auth/callback)
    if (!user.username) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/form.html?email=${encodeURIComponent(
          email
        )}`
      );
    }

    if (user.role === 'admin') {
      return res.redirect(`${process.env.FRONTEND_URL}/admin.html`);
    }

    return res.redirect(`${process.env.FRONTEND_URL}/home.html`);
  } catch (e) {
    console.error(
      'google callback error',
      e?.response?.data || e?.message || e
    );
    return res.redirect(
      `${process.env.FRONTEND_URL}/login.html?error=oauth_failed`
    );
  }
});

module.exports = router;
