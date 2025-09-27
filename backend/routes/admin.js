const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const { verifyJWT, requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/admin/users (paginated, exclude sensitive fields)
router.get('/users', verifyJWT, requireAuth, requireAdmin, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const users = await User.find({})
      .select('-password -verificationCode -codeExpires -resetToken -resetTokenExp')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await User.countDocuments();
    res.status(200).json({
      ok: true,
      data: { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
    });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id',
  verifyJWT, requireAuth, requireAdmin,
  [body('username').optional().trim().escape().isLength({ min: 3, max: 30 }),
   body('email').optional().isEmail().normalizeEmail(),
   body('role').optional().isIn(['user', 'admin'])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, message: errors.array()[0].msg });
    }

    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
        .select('-password');
      if (!user) return res.status(404).json({ ok: false, message: 'User  not found' });
      res.status(200).json({ ok: true, data: user });
    } catch (err) {
      res.status(500).json({ ok: false, message: 'Update failed' });
    }
  }
);

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyJWT, requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: 'User  not found' });
    res.status(200).json({ ok: true, message: 'User  deleted' });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Deletion failed' });
  }
});

// GET /api/admin/export-users (simple JSON; CSV optional via client-side)
router.get('/export-users', verifyJWT, requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email role createdAt')
      .sort({ createdAt: -1 });
    res.status(200).json({ ok: true, data: users }); // Client can convert to CSV
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Export failed' });
  }
});

module.exports = router;