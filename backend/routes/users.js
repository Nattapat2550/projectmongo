import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import User from '../models/user.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

// Multer storage for avatar uploads
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const base = (req.user?._id?.toString() || 'file') + '-' + Date.now();
    cb(null, base + ext);
  }
});
const upload = multer({ storage });

router.use(isAuthenticated);

router.get('/me', async (req, res) => {
  const { username, email, profilePicture, role, _id } = req.user;
  res.json({ id: _id, username, email, profilePicture, role });
});

router.put('/settings', async (req, res) => {
  const { username } = req.body;
  if (username) req.user.username = username;
  await req.user.save();
  res.json({ message: 'Updated', username: req.user.username });
});

router.post('/settings/upload-picture', upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  // Save public path
  const webPath = '/uploads/' + path.basename(req.file.path);
  req.user.profilePicture = webPath;
  await req.user.save();
  res.json({ message: 'Uploaded', profilePicture: webPath });
});

router.delete('/account', async (req, res) => {
  await User.deleteOne({ _id: req.user._id });
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' });
  res.json({ message: 'Account deleted' });
});

export default router;
