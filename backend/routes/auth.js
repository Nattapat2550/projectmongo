const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
//const { v4: uuidv4 } = require('uuid');  For unique tokens if needed
const User = require('../models/user');
const { generateCode } = require('../utils/generateCode');
const { sendMail } = require('../utils/gmail');
const { verifyJWT, setJWTCookie } = require('../middleware/auth');

const router = express.Router();

// Rate limit auth endpoints (5 attempts per 15min)
/*const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, message: 'Too many attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});*/

// Passport Google strategy setup
passport.use(new (require('passport-google-oauth20').Strategy)({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URI,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
    if (user) {
      if (user.authProvider === 'google' && user.emailVerified) {
        return done(null, user);
      }
      // If local user exists, link if emails match (for simplicity, update provider)
      user.authProvider = 'google';
      user.photo = profile.photos[0]?.value || user.photo;
      await user.save();
      return done(null, user);
    } else {
      // Create new Google user
      user = new User({
        email: profile.emails[0].value.toLowerCase(),
        emailVerified: true,
        username: profile.displayName || null,
        photo: profile.photos[0]?.value || '/images/user.png',
        authProvider: 'google',
      });
      await user.save();
      return done(null, user);
    }
  } catch (err) {
    done(err);
  }
}));

passport.serializeUser ((user, done) => done(null, user.id));
passport.deserializeUser (async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

router.use(passport.initialize());

// POST /api/auth/register
/*router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { email } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user) {
        if (user.emailVerified) {
          return res.status(409).json({ ok: false, message: 'Email already registered' });
        }
        // Resend if not verified (simple limit: within 15min)
        if (user.codeExpires > Date.now()) {
          return res.status(429).json({ ok: false, message: 'Code recently sent, try again soon' });
        }
      } else {
        user = new User({ email });
        await user.save();
      }

      const code = generateCode();
      user.verificationCode = code;
      user.codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15min
      await user.save();

      // Send email
      const subject = 'Your Verification Code';
      const text = `Your 6-digit code is: ${code}. Expires in 15 minutes.`;
      const html = `<p>Your 6-digit code is: <strong>${code}</strong></p><p>Expires in 15 minutes.</p>`;
      await sendMail({ to: email, subject, text, html });

      res.status(200).json({ ok: true, message: 'Verification code sent' });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Registration failed' });
    }
  }
);*/

// POST /api/auth/verify-code
router.post('/verify-code',
  [
    body('email').isEmail().normalizeEmail(),
    body('code').isLength({ min: 6, max: 6 }).isNumeric(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { email, code } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || user.verificationCode !== code || user.codeExpires < Date.now()) {
        return res.status(400).json({ ok: false, message: 'Invalid or expired code' });
      }

      user.emailVerified = true;
      user.verificationCode = undefined;
      user.codeExpires = undefined;
      await user.save();

      const encodedEmail = encodeURIComponent(email);
      res.status(200).json({ ok: true, redirect: `${process.env.FRONTEND_URL}/form.html?email=${encodedEmail}` });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Verification failed' });
    }
  }
);

// POST /api/auth/complete-profile
router.post('/complete-profile',
  [
    body('email').isEmail().normalizeEmail(),
    body('username').notEmpty().trim().escape().isLength({ min: 3, max: 30 }),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { email, username, password } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || !user.emailVerified) {
        return res.status(400).json({ ok: false, message: 'Email not verified' });
      }
      if (user.username) {
        return res.status(400).json({ ok: false, message: 'Profile already complete' });
      }

      user.username = username;
      user.password = password; // Will be hashed in pre-save
      user.authProvider = 'local';
      await user.save();

      setJWTCookie(res, user);
            const redirect = user.role === 'admin' ? `${process.env.FRONTEND_URL}/admin.html` : `${process.env.FRONTEND_URL}/home.html`;
      res.status(201).json({ ok: true, redirect });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Profile completion failed' });
    }
  }
);

// POST /api/auth/login
router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('remember').optional().isBoolean().toBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { email, password, remember = false } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user || user.authProvider === 'google' || !(await bcrypt.compare(password, user.password || ''))) {
        return res.status(401).json({ ok: false, message: 'Invalid email or password' });
      }

      setJWTCookie(res, user, remember);
      const redirect = user.role === 'admin' ? `${process.env.FRONTEND_URL}/admin.html` : `${process.env.FRONTEND_URL}/home.html`;
      res.status(200).json({ ok: true, redirect });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Login failed' });
    }
  }
);

// GET /api/auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login.html` }),
  (req, res) => {
    const user = req.user;
    if (!user.username) {
      // Redirect to complete profile if username missing
      const encodedEmail = encodeURIComponent(user.email);
      return res.redirect(`${process.env.FRONTEND_URL}/form.html?email=${encodedEmail}&from=google`);
    }
    // Set cookie and redirect
    setJWTCookie(res, user);
    const redirect = user.role === 'admin' ? `${process.env.FRONTEND_URL}/admin.html` : `${process.env.FRONTEND_URL}/home.html`;
    res.redirect(redirect);
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists
        return res.status(200).json({ ok: true, message: 'If email exists, reset link sent' });
      }

      // Generate reset token (JWT with purpose)
      const payload = { id: user._id, purpose: 'reset', iat: Date.now() };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
      user.resetToken = token;
      user.resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1h
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset.html?token=${token}`;
      const subject = 'Password Reset Request';
      const text = `Reset your password: ${resetUrl}`;
      const html = `<p>Click <a href="${resetUrl}">here</a> to reset your password. Expires in 1 hour.</p>`;
      await sendMail({ to: email, subject, text, html });

      res.status(200).json({ ok: true, message: 'If email exists, reset link sent' });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Reset request failed' });
    }
  }
);

// POST /api/auth/reset-password
router.post('/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min: 8 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { token, password } = req.body;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== 'reset') {
        return res.status(400).json({ ok: false, message: 'Invalid reset token' });
      }

      const user = await User.findById(decoded.id);
      if (!user || user.resetTokenExp < Date.now()) {
        return res.status(400).json({ ok: false, message: 'Invalid or expired token' });
      }

      user.password = password; // Will hash in pre-save
      user.resetToken = undefined;
      user.resetTokenExp = undefined;
      await user.save();

      res.status(200).json({ ok: true, redirect: `${process.env.FRONTEND_URL}/login.html` });
    } catch (err) {
      res.status(400).json({ ok: false, message: 'Invalid token' });
    }
  }
);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.status(200).json({ ok: true, redirect: `${process.env.FRONTEND_URL}/index.html` });
});

module.exports = router;