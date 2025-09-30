import express from 'express';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';
import User from '../models/user.js';
import Homepage from '../models/homepage.js';

const router = express.Router();

router.use(isAuthenticated, isAdmin);

/* Users */
router.get('/users', async (_req, res) => {
  const users = await User.find({}, { password: 0, verificationCode:0, verificationCodeExpires:0, resetPasswordToken:0, resetPasswordExpires:0 }).lean();
  res.json(users);
});

router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { role, username } = req.body || {};
  const u = await User.findById(id);
  if (!u) return res.status(404).json({ message: 'Not found' });
  if (role) u.role = role;
  if (typeof username === 'string') u.username = username;
  await u.save();
  res.json({ message: 'Updated' });
});

/* Homepage content */
router.get('/homepage-content', async (_req, res) => {
  const doc = (await Homepage.find().limit(1))[0] || await Homepage.create({ body: '', carousel: [] });
  res.json({ body: doc.body || '' });
});

router.put('/homepage-content', async (req, res) => {
  const { body } = req.body || {};
  const doc = (await Homepage.find().limit(1))[0] || await Homepage.create({ body: '', carousel: [] });
  doc.body = body || '';
  await doc.save();
  res.json({ message: 'Saved' });
});

/* Carousel CRUD */
router.get('/carousel', async (_req, res) => {
  const doc = (await Homepage.find().limit(1))[0] || await Homepage.create({ body:'', carousel:[] });
  const items = (doc.carousel || []).sort((a,b)=>a.index-b.index);
  res.json(items);
});

router.post('/carousel', async (req, res) => {
  const { index=0, title='', subtitle='', description='', imageUrl='/images/user.png', active=true } = req.body || {};
  const doc = (await Homepage.find().limit(1))[0] || await Homepage.create({ body:'', carousel:[] });
  doc.carousel.push({ index, title, subtitle, description, imageUrl, active });
  await doc.save();
  res.json({ message: 'Added' });
});

router.put('/carousel/:id', async (req, res) => {
  const { id } = req.params;
  const { index, title, subtitle, description, imageUrl, active } = req.body || {};
  const doc = (await Homepage.find().limit(1))[0] || await Homepage.create({ body:'', carousel:[] });
  const item = (doc.carousel || []).id(id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  if (index !== undefined) item.index = Number(index);
  if (title !== undefined) item.title = String(title);
  if (subtitle !== undefined) item.subtitle = String(subtitle);
  if (description !== undefined) item.description = String(description);
  if (imageUrl !== undefined) item.imageUrl = String(imageUrl);
  if (active !== undefined) item.active = !!active;
  await doc.save();
  res.json({ message: 'Updated' });
});

router.delete('/carousel/:id', async (req, res) => {
  const { id } = req.params;
  const doc = (await Homepage.find().limit(1))[0] || await Homepage.create({ body:'', carousel:[] });
  const item = (doc.carousel || []).id(id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  item.deleteOne();
  await doc.save();
  res.json({ message: 'Deleted' });
});

export default router;
