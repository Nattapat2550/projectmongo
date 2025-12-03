const express = require('express');
const mongoose = require('../config/db');
const { authenticateJWT, isAdmin } = require('../middleware/auth');

const { Schema } = mongoose;
const router = express.Router();

// map จาก table homepage_content เดิม
const homepageContentSchema = new Schema({
  section_name: { type: String, required: true, unique: true, index: true },
  content: { type: String, default: '' },
});

const HomepageContent =
  mongoose.models.HomepageContent || mongoose.model('HomepageContent', homepageContentSchema);

// GET /api/homepage  (public)
router.get('/', async (_req, res) => {
  try {
    const docs = await HomepageContent.find().sort({ section_name: 1 });
    const rows = docs.map((d) => ({
      section_name: d.section_name,
      content: d.content,
    }));
    res.json(rows);
  } catch (e) {
    console.error('homepage get error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/homepage  (admin, upsert ตาม section_name)
router.put('/', authenticateJWT, isAdmin, async (req, res) => {
  const { section_name, content } = req.body || {};
  if (!section_name) {
    return res.status(400).json({ error: 'Missing section_name' });
  }

  try {
    const doc = await HomepageContent.findOneAndUpdate(
      { section_name },
      { section_name, content: content || '' },
      { new: true, upsert: true }
    );
    res.json({
      section_name: doc.section_name,
      content: doc.content,
    });
  } catch (e) {
    console.error('homepage upsert error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
