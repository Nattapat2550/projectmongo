// /backend/routes/users.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { isAuthenticated } from '../middleware/auth.js';
import User from '../models/user.js';

const router = express.Router();

// --------- /me ----------
router.get('/me', isAuthenticated, async (req, res) => {
  const u = req.user;
  return res.json({
    _id: u._id,
    email: u.email,
    username: u.username || '',
    profilePicture: u.profilePicture || '/images/user.png',
    role: u.role || 'user',
  });
});

// --------- settings ----------
router.put('/settings', isAuthenticated, async (req, res) => {
  const { username } = req.body;
  const user = await User.findById(req.user._id);
  if (username) user.username = username;
  await user.save();
  res.json({ message: 'Updated', username: user.username });
});

// --------- upload-picture ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const id = String(Date.now());
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({ storage });

router.post('/settings/upload-picture', isAuthenticated, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  const rel = `/uploads/${req.file.filename}`;
  const user = await User.findById(req.user._id);
  user.profilePicture = rel;
  await user.save();
  res.json({ message: 'Uploaded', profilePicture: rel });
});

// --------- delete account ----------
router.delete('/account', isAuthenticated, async (req, res) => {
  await User.deleteOne({ _id: req.user._id });
  res.json({ message: 'Account deleted' });
});

export default router;
