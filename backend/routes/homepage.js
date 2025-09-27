const express = require('express');
const Homepage = require('../models/homepage');

const router = express.Router();

// Get homepage content (public)
router.get('/:slug', async (req, res) => {
  try {
    const content = await Homepage.findOne({ slug: req.params.slug });
    if (!content) return res.status(404).json({ error: 'Content not found' });
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all homepage sections (for rendering home page)
router.get('/', async (req, res) => {
  try {
    const contents = await Homepage.find();
    res.json(contents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;