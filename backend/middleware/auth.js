const jwt = require('jsonwebtoken');
const User = require('../models/user');

const verifyJWT = (req, res, next) => {
  let token = req.cookies.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ ok: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    res.status(403).json({ ok: false, message: 'Invalid or expired token' });
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, message: 'Authentication required' });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Admin access required' });
    }
    next();
  });
};

// Helper to set JWT cookie
const setJWTCookie = (res, user, remember = false) => {
  const payload = { id: user._id, role: user.role };
  const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000; // 30d or 7d
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: maxAge / 1000 });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
  });
};

module.exports = { verifyJWT, requireAuth, requireAdmin, setJWTCookie };