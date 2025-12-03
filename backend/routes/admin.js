const express = require('express');
const { authenticateJWT, isAdmin } = require('../middleware/auth');
const { getAllUsers, adminUpdateUser } = require('../models/user');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 4 * 1024 * 1024 } });

const {
  createCarouselItem,
  updateCarouselItem,
  deleteCarouselItem,
  listCarouselItems,
} = require('../models/carousel');

const router = express.Router();

// ===== Users (admin) =====

router.get('/users', authenticateJWT, isAdmin, async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (e) {
    console.error('admin get users error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/users/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, profile_picture_url } = req.body || {};

    const row = await adminUpdateUser(id, {
      username,
      email,
      role,
      profile_picture_url,
    });

    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(row);
  } catch (e) {
    if (e.code === 'DUPLICATE') {
      return res.status(409).json({ error: 'Duplicate value' });
    }
    console.error('admin update user error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ===== Carousel admin endpoints =====

router.get('/carousel', authenticateJWT, isAdmin, async (_req, res) => {
  try {
    const items = await listCarouselItems();
    res.json(items);
  } catch (e) {
    console.error('admin list carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/carousel', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const { itemIndex, title, subtitle, description } = req.body || {};
    if (!req.file) {
      return res.status(400).json({ error: 'No file' });
    }

    const mime = req.file.mimetype;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    const b64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;

    const created = await createCarouselItem({
      itemIndex: itemIndex !== undefined ? Number(itemIndex) : 0,
      title,
      subtitle,
      description,
      imageDataUrl: dataUrl,
    });

    res.status(201).json(created);
  } catch (e) {
    console.error('admin create carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/carousel/:id', authenticateJWT, isAdmin, upload.single('image'), async (req, res) => {
  try {
    const id = req.params.id;
    const { itemIndex, title, subtitle, description } = req.body || {};

    let dataUrl;
    if (req.file) {
      const mime = req.file.mimetype;
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
        return res.status(400).json({ error: 'Unsupported file type' });
      }
      const b64 = req.file.buffer.toString('base64');
      dataUrl = `data:${mime};base64,${b64}`;
    }

    const updated = await updateCarouselItem(id, {
      itemIndex: itemIndex !== undefined && itemIndex !== '' ? Number(itemIndex) : undefined,
      title,
      subtitle,
      description,
      imageDataUrl: dataUrl,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json(updated);
  } catch (e) {
    console.error('admin update carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/carousel/:id', authenticateJWT, isAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    await deleteCarouselItem(id);
    res.status(204).end();
  } catch (e) {
    console.error('admin delete carousel error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
