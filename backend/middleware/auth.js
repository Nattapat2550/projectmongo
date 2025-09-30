// /backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/user.js';

export async function isAuthenticated(req, res, next) {
  try {
    const bearer = req.headers.authorization || '';
    const headerToken = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
    const cookieToken = req.cookies?.token;
    const token = headerToken || cookieToken;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function isAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  next();
}
