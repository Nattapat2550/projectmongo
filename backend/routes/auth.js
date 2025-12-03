// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const User = require('../models/user.js');
const { authenticateJWT } = require('../middleware/auth.js');

const router = express.Router();

// ===== ENV =====
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URI = process.env.GOOGLE_CALLBACK_URI;

// ===== Helpers =====

function createJwtForUser(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not set');
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role || 'user',
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function sendAuthCookie(res, user) {
  const token = createJwtForUser(user);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,            // บน Render เป็น https เลยเปิด true ได้
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 วัน
  });

  return token;
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

// ===== Local Register / Login =====

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email และ password จำเป็นต้องมี' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'อีเมลนี้มีผู้ใช้งานแล้ว' });
    }

    const user = new User({
      email: email.toLowerCase(),
      password,
      username: username || email.split('@')[0],
      role: 'user',
    });

    await user.save();

    sendAuthCookie(res, user);
    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('POST /api/auth/register error:', err);
    res.status(500).json({ message: 'Server error while registering user' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email และ password จำเป็นต้องมี' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    sendAuthCookie(res, user);
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ message: 'Server error while logging in' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
  });

  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user && (req.user.id || req.user.userId || req.user._id);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('GET /api/auth/me error:', err);
    res.status(500).json({ message: 'Server error while fetching current user' });
  }
});

// ===== Google OAuth Login =====

const oauth2Client =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URI
    ? new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_CALLBACK_URI
      )
    : null;

// GET /api/auth/google
router.get('/google', (req, res) => {
  try {
    if (!oauth2Client) {
      return res.status(500).send('Google OAuth is not configured');
    }

    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'select_account',
      scope: scopes,
    });

    res.redirect(url);
  } catch (err) {
    console.error('GET /api/auth/google error:', err);
    res.status(500).send('Unable to start Google login');
  }
});

// GET /api/auth/google/callback
router.get('/google/callback', async (req, res) => {
  try {
    if (!oauth2Client) {
      return res.status(500).send('Google OAuth is not configured');
    }

    const { code } = req.query;
    if (!code) {
      return res.status(400).send('Missing code');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: 'v2',
    });

    const { data: profile } = await oauth2.userinfo.get();

    const googleId = profile.id;
    const email = profile.email && profile.email.toLowerCase();
    const picture = profile.picture;
    const name = profile.name || (email ? email.split('@')[0] : 'User');

    let user = null;

    // 1) หา user ด้วย googleId ก่อน
    if (googleId) {
      user = await User.findOne({ googleId });
    }

    // 2) ถ้ายังไม่เจอ แต่มี email → หา user จาก email แล้วผูก googleId เพิ่ม
    if (!user && email) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = googleId;
        if (picture && !user.profilePicture) {
          user.profilePicture = picture;
        }
        if (!user.username) {
          user.username = name;
        }
        await user.save();
      }
    }

    // 3) ถ้ายังไม่มี → สร้างใหม่
    if (!user) {
      user = new User({
        email,
        googleId,
        username: name,
        profilePicture: picture || '',
        role: 'user',
      });
      await user.save();
    }

    sendAuthCookie(res, user);

    // หลัง login ผ่าน google เสร็จ ให้ redirect กลับ frontend
    const redirectUrl = `${FRONTEND_URL}/auth/callback?provider=google`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('GET /api/auth/google/callback error:', err);
    res.status(500).send('Google login failed');
  }
});

module.exports = router;
