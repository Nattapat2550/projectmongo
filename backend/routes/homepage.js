const express = require('express');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { verifyJWT, requireAuth, requireAdmin } = require('../middleware/auth');

// Simple in-memory Homepage model (one doc for content)
const HomepageSchema = new mongoose.Schema({
  title: { type: String, default: 'Welcome to Our App' },
  hero: { type: String, default: 'Hero section content' },
  blocks: [{ type: String }], // Array of content blocks
  updatedAt: { type: Date, default: Date.now }
});
const Homepage = mongoose.model('Homepage', HomepageSchema, 'homepage'); // Use 'homepage' collection

const router = express.Router();

// GET /api/homepage/content (public)
router.get('/content', async (req, res) => {
  try {
    let content = await Homepage.findOne();
    if (!content) {
      content = new Homepage({ title: 'Welcome', hero: 'Default hero', blocks: ['Block 1', 'Block 2'] });
      await content.save();
    }
    res.status(200).json({ ok: true, data: content });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to fetch content' });
  }
});

// PUT /api/homepage/content (admin only)
router.put('/content',
  verifyJWT, requireAuth, requireAdmin,
  [body('title').optional().trim().notEmpty(),
   body('hero').optional().trim().notEmpty(),
   body('blocks').optional().isArray({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    try {
      const content = await Homepage.findOneAndUpdate(
        {},
        { ...req.body, updatedAt: Date.now() },
        { new: true, upsert: true }
      );
      res.status(200).json({ ok: true, data: content });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Update failed' });
    }
  }
);

module.exports = router;