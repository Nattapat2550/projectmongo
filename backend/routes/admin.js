// backend/routes/admin.js (CommonJS)
const express = require('express');
const User = require('../models/user.js');
const Homepage = require('../models/homepage.js');
const { authenticateJWT, isAdmin } = require('../middleware/auth.js');

const router = express.Router();

/**
 * Helper: ensure there is exactly one Homepage document.
 */
async function ensureHomepageDoc() {
  let doc = await Homepage.findOne();
  if (!doc) {
    doc = new Homepage({
      body: '',
      carousel: [],
    });
    await doc.save();
  }
  return doc;
}

/**
 * =========================
 *  Users (admin only)
 *  Base path: /api/admin
 * =========================
 */

/**
 * GET /api/admin/users
 */
router.get('/users', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select(
        '-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires -__v'
      );

    res.json({ users });
  } catch (err) {
    console.error('GET /api/admin/users error:', err);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

/**
 * PUT /api/admin/users/:id
 */
router.put('/users/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { role, username } = req.body;
    const update = {};

    if (role) update.role = role;
    if (username) update.username = username;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).select(
      '-password -verificationCode -verificationCodeExpires -resetPasswordToken -resetPasswordExpires -__v'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('PUT /api/admin/users/:id error:', err);
    res.status(500).json({ message: 'Server error while updating user' });
  }
});

/**
 * ============================================
 *  Homepage Content (body text / main content)
 * ============================================
 */

/**
 * GET /api/admin/homepage-content
 */
router.get('/homepage-content', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const homepage = await ensureHomepageDoc();
    res.json({ body: homepage.body ?? '' });
  } catch (err) {
    console.error('GET /api/admin/homepage-content error:', err);
    res.status(500).json({ message: 'Server error while fetching homepage content' });
  }
});

/**
 * PUT /api/admin/homepage-content
 */
router.put('/homepage-content', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { body } = req.body;

    const homepage = await ensureHomepageDoc();
    homepage.body = typeof body === 'string' ? body : '';
    await homepage.save();

    res.json({ body: homepage.body });
  } catch (err) {
    console.error('PUT /api/admin/homepage-content error:', err);
    res.status(500).json({ message: 'Server error while updating homepage content' });
  }
});

/**
 * =========================
 *  Carousel Management
 * =========================
 */

/**
 * GET /api/admin/carousel
 */
router.get('/carousel', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const homepage = await ensureHomepageDoc();
    const slides = [...(homepage.carousel || [])].sort((a, b) => {
      const ai = typeof a.index === 'number' ? a.index : 0;
      const bi = typeof b.index === 'number' ? b.index : 0;
      return ai - bi;
    });

    res.json({ slides });
  } catch (err) {
    console.error('GET /api/admin/carousel error:', err);
    res.status(500).json({ message: 'Server error while fetching carousel' });
  }
});

/**
 * POST /api/admin/carousel
 */
router.post('/carousel', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { index, title, subtitle, description, imageUrl, active } = req.body;

    const homepage = await ensureHomepageDoc();

    let nextIndex = 0;
    if (typeof index === 'number') {
      nextIndex = index;
    } else if (Array.isArray(homepage.carousel) && homepage.carousel.length > 0) {
      const maxIndex = Math.max(
        ...homepage.carousel.map((s) => (typeof s.index === 'number' ? s.index : 0))
      );
      nextIndex = maxIndex + 1;
    }

    const newSlide = {
      index: nextIndex,
      title: title ?? '',
      subtitle: subtitle ?? '',
      description: description ?? '',
      imageUrl: imageUrl ?? '',
      active: typeof active === 'boolean' ? active : true,
    };

    homepage.carousel.push(newSlide);
    await homepage.save();

    const created = homepage.carousel[homepage.carousel.length - 1];

    res.status(201).json({ slide: created });
  } catch (err) {
    console.error('POST /api/admin/carousel error:', err);
    res.status(500).json({ message: 'Server error while creating carousel slide' });
  }
});

/**
 * PUT /api/admin/carousel/:id
 */
router.put('/carousel/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { index, title, subtitle, description, imageUrl, active } = req.body;

    const homepage = await ensureHomepageDoc();
    const slide = homepage.carousel.id(id);

    if (!slide) {
      return res.status(404).json({ message: 'Slide not found' });
    }

    if (typeof index === 'number') slide.index = index;
    if (typeof title === 'string') slide.title = title;
    if (typeof subtitle === 'string') slide.subtitle = subtitle;
    if (typeof description === 'string') slide.description = description;
    if (typeof imageUrl === 'string') slide.imageUrl = imageUrl;
    if (typeof active === 'boolean') slide.active = active;

    await homepage.save();

    res.json({ slide });
  } catch (err) {
    console.error('PUT /api/admin/carousel/:id error:', err);
    res.status(500).json({ message: 'Server error while updating carousel slide' });
  }
});

/**
 * DELETE /api/admin/carousel/:id
 */
router.delete('/carousel/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const homepage = await ensureHomepageDoc();
    const slide = homepage.carousel.id(id);

    if (!slide) {
      return res.status(404).json({ message: 'Slide not found' });
    }

    slide.deleteOne();
    await homepage.save();

    res.json({ message: 'Slide deleted' });
  } catch (err) {
    console.error('DELETE /api/admin/carousel/:id error:', err);
    res.status(500).json({ message: 'Server error while deleting carousel slide' });
  }
});

module.exports = router;
