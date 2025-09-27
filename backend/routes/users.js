const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const User = require('../models/user');
const { verifyJWT, requireAuth } = require('../middleware/auth');

const router = express.Router();

// Multer setup for profile photo (2MB limit, images only)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
});

// GET /api/users/me
router.get('/me', verifyJWT, requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email username photo role');
    if (!user) return res.status(404).json({ ok: false, message: 'User  not found' });
    res.status(200).json({ ok: true, data: user });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to fetch profile' });
  }
});

// PUT /api/users/me (update username/photo)
router.put('/me',
  verifyJWT, requireAuth,
  upload.single('photo'),
  [body('username').optional().trim().escape().isLength({ min: 3, max: 30 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ ok: false, message: 'User  not found' });

      if (req.body.username) user.username = req.body.username;
      if (req.file) user.photo = `/uploads/${req.file.filename}`;

      await user.save();
      res.status(200).json({ ok: true, data: { email: user.email, username: user.username, photo: user.photo, role: user.role } });
    } catch (err) {
      // Cleanup uploaded file on error
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ ok: false, message: 'Update failed' });
    }
  }
);

// POST /api/users/me/change-password
router.post('/me/change-password',
  verifyJWT, requireAuth,
  [body('oldPassword').notEmpty(), body('newPassword').isLength({ min: 8 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    const { oldPassword, newPassword } = req.body;
    try {
      const user = await User.findById(req.user.id);
      if (!user || user.authProvider !== 'local' || !(await bcrypt.compare(oldPassword, user.password))) {
        return res.status(400).json({ ok: false, message: 'Invalid old password' });
      }

      user.password = newPassword; // Hashes in pre-save
      await user.save();
      res.status(200).json({ ok: true, message: 'Password changed' });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Password change failed' });
    }
  }
);

// DELETE /api/users/me
router.delete('/me', verifyJWT, requireAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User  not found' });
    res.clearCookie('token');
    res.status(200).json({ ok: true, message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Deletion failed' });
  }
});

module.exports = router;