import express from 'express';
import mongoose from 'mongoose';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import User from '../models/user.js';

const router = express.Router();
router.use(isAuthenticated, isAdmin);

// Inline model for homepage content & carousel (no extra files)
const HomepageContent = mongoose.models.HomepageContent || mongoose.model('HomepageContent', new mongoose.Schema({
  body: { type: String, default: '' },
}, { timestamps: true }));

const CarouselItem = mongoose.models.CarouselItem || mongoose.model('CarouselItem', new mongoose.Schema({
  index: { type: Number, required: true },
  title: String,
  subtitle: String,
  description: String,
  imageUrl: String,   // can be absolute or /uploads/*
  active: { type: Boolean, default: true },
}, { timestamps: true }));

router.get('/users', async (req, res) => {
  const users = await User.find({}, 'username email role profilePicture').sort({ createdAt: -1 });
  res.json(users);
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role, username } = req.body;
  const user = await User.findById(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (role) user.role = role;
  if (username) user.username = username;
  await user.save();
  res.json({ message: 'Updated' });
});

router.get('/homepage-content', async (req, res) => {
  let content = await HomepageContent.findOne();
  if (!content) content = await HomepageContent.create({ body: '' });
  res.json(content);
});

router.put('/homepage-content', async (req, res) => {
  const { body } = req.body;
  let content = await HomepageContent.findOne();
  if (!content) content = await HomepageContent.create({ body: body || '' });
  else { content.body = body || ''; await content.save(); }
  res.json({ message: 'Saved' });
});

// Carousel CRUD
router.get('/carousel', async (req, res) => {
  const items = await CarouselItem.find({}).sort({ index: 1, createdAt: 1 });
  res.json(items);
});

router.post('/carousel', async (req, res) => {
  const { index, title, subtitle, description, imageUrl, active } = req.body;
  const created = await CarouselItem.create({ index, title, subtitle, description, imageUrl, active });
  res.json(created);
});

router.put('/carousel/:id', async (req, res) => {
  const { id } = req.params;
  const item = await CarouselItem.findByIdAndUpdate(id, req.body, { new: true });
  if (!item) return res.status(404).json({ message: 'Not found' });
  res.json(item);
});

router.delete('/carousel/:id', async (req, res) => {
  const { id } = req.params;
  await CarouselItem.findByIdAndDelete(id);
  res.json({ message: 'Deleted' });
});

export default router;
