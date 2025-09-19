const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for profile picture upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads/profile_pictures';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only .jpeg, .jpg and .png files are allowed'));
  }
}).single('profilePicture');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -googleId');
    if (!user) return res.status(404).json({ message: 'User  not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateName = async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ message: 'Username is required' });

  try {
    const existingUser  = await User.findOne({ username });
    if (existingUser  && existingUser ._id.toString() !== req.user.id) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, { username }, { new: true }).select('-password -googleId');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadProfilePicture = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });

    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User  not found' });

      user.profilePicture = `/uploads/profile_pictures/${req.file.filename}`;
      await user.save();

      res.json({ profilePicture: user.profilePicture });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });
};

exports.deleteAccount = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};