// backend/routes/users.js
const express = require('express');
const { authenticateJWT, clearAuthCookie } = require('../middleware/auth');
const User = require('../models/user'); // ใช้ Mongoose model ตรง ๆ
const multer = require('multer');
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

const router = express.Router();

// ===== helper =====

function getUserIdFromReq(req) {
  if (!req.user) return null;
  return req.user.id || req.user.userId || req.user._id || null;
}

// รองรับทั้ง schema ที่ใช้ profile_picture_url หรือ profilePicture
function buildUserResponse(doc) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  const id = obj._id ? obj._id.toString() : obj.id;
  const profileUrl = obj.profile_picture_url || obj.profilePicture || null;
  return {
    id,
    username: obj.username,
    email: obj.email,
    role: obj.role,
    profile_picture_url: profileUrl,
  };
}

// ===== routes =====

// GET /api/users/me
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      // token ชี้ไป user ที่ไม่มีแล้ว → เคลียร์ cookie กัน loop
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json(buildUserResponse(user));
  } catch (e) {
    console.error('GET /api/users/me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/users/me
router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, profilePictureUrl } = req.body || {};
    const update = {};

    if (typeof username === 'string') update.username = username;
    if (typeof profilePictureUrl === 'string') {
      // set ทั้งสอง field เผื่อ schema ใช้อันใดอันหนึ่ง
      update.profile_picture_url = profilePictureUrl;
      update.profilePicture = profilePictureUrl;
    }

    const user = await User.findByIdAndUpdate(userId, update, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.json(buildUserResponse(user));
  } catch (e) {
    // duplicate key ของ Mongo
    if (e && (e.code === 11000 || e.code === '11000')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error('PUT /api/users/me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/users/me
router.delete('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await User.findByIdAndDelete(userId);

    clearAuthCookie(res);
    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /api/users/me error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/users/me/avatar
router.post(
  '/me/avatar',
  authenticateJWT,
  upload.single('avatar'),
  async (req, res) => {
    try {
      const userId = getUserIdFromReq(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file' });
      }

      const mime = req.file.mimetype;
      if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      const b64 = req.file.buffer.toString('base64');
      const dataUrl = `data:${mime};base64,${b64}`;

      const update = {
        profile_picture_url: dataUrl,
        profilePicture: dataUrl,
      };

      const user = await User.findByIdAndUpdate(userId, update, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }

      return res.json({
        ok: true,
        profile_picture_url:
          user.profile_picture_url || user.profilePicture || null,
      });
    } catch (e) {
      console.error('upload avatar error', e);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);

module.exports = router;
