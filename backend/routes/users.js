// backend/routes/users.js
const express = require('express');
const { authenticateJWT, clearAuthCookie } = require('../middleware/auth');
const { updateProfile, deleteUser, findUserById } = require('../models/user');
const multer = require('multer');
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

const router = express.Router();

// helper ดึง userId จาก token (รองรับหลายรูปแบบ)
function getUserIdFromReq(req) {
  if (!req.user) return null;
  return req.user.id || req.user.userId || req.user._id || null;
}

router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      // ไม่มี user ใน token → ยังไม่ล็อกอิน
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const u = await findUserById(userId);
    if (!u) {
      // token มี แต่ user ใน DB หายไปแล้ว → ถือว่าไม่ authorized และลบ cookie กัน loop
      clearAuthCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id, username, email, role, profile_picture_url } = u;
    res.json({ id, username, email, role, profile_picture_url });
  } catch (e) {
    console.error('get /me error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username, profilePictureUrl } = req.body || {};
    const updated = await updateProfile(userId, { username, profilePictureUrl });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    const { id, email, role, profile_picture_url } = updated;
    res.json({ id, username: updated.username, email, role, profile_picture_url });
  } catch (e) {
    // เดิมเช็ค code '23505' ของ PostgreSQL → ตอนนี้เป็น Mongo จะไม่เข้าเคสนี้แล้ว
    if (e.code === '23505' || e.code === 11000) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    console.error('update profile error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await deleteUser(userId);
    // ลบบัญชีเสร็จแล้ว ให้ลบ cookie token ทิ้งด้วย เพื่อกัน loop index/home
    clearAuthCookie(res);
    res.status(204).end();
  } catch (e) {
    console.error('delete me error', e);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Avatar upload
router.post('/me/avatar', authenticateJWT, upload.single('avatar'), async (req, res) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) return res.status(400).json({ error: 'No file' });
    const mime = req.file.mimetype;
    if (!/^image\/(png|jpe?g|gif|webp)$/.test(mime)) {
      return res.status(400).json({ error: 'Unsupported file type' });
    }
    const b64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;
    const updated = await updateProfile(userId, { profilePictureUrl: dataUrl });
    return res.json({ ok: true, profile_picture_url: updated.profile_picture_url });
  } catch (e) {
    console.error('upload avatar error', e);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
