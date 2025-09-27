const express = require('express');
const User = require('../models/user');
const Homepage = require('../models/homepage');

const router = express.Router();

// Middleware to check admin (in auth.js, but inline here for completeness; better in middleware/auth.js)
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// Get all users
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/users/:id', isAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User  deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update homepage content
router.put('/homepage/:slug', isAdmin, async (req, res) => {
  try {
    const { title, body, metadata } = req.body;
    const content = await Homepage.findOneAndUpdate(
      { slug: req.params.slug },
      { title, body, metadata },
      { new: true, upsert: true }
    );
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get homepage content
router.get('/homepage/:slug', isAdmin, async (req, res) => {
  try {
    const content = await Homepage.findOne({ slug: req.params.slug });
    res.json(content || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;