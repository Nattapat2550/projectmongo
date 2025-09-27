const express = require('express');
const User = require('../models/user');
const multer = require('multer'); // For profilePicture upload

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // In prod, use S3/Cloudinary

// Get profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', upload.single('profilePicture'), async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: Date.now() };
    if (req.file) updates.profilePicture = req.file.path; // In prod: upload to cloud
    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update theme
router.put('/theme', async (req, res) => {
  const { theme } = req.body;
  try {
    const user = await User.findByIdAndUpdate(req.user.id, { theme }, { new: true });
    res.json({ theme: user.theme });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;