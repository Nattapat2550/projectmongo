import express from 'express';
import mongoose from 'mongoose';

const router = express.Router();

const HomepageContent = mongoose.models.HomepageContent || mongoose.model('HomepageContent', new mongoose.Schema({
  body: { type: String, default: '' },
}, { timestamps: true }));

const CarouselItem = mongoose.models.CarouselItem || mongoose.model('CarouselItem', new mongoose.Schema({
  index: { type: Number, required: true },
  title: String,
  subtitle: String,
  description: String,
  imageUrl: String,
  active: { type: Boolean, default: true },
}, { timestamps: true }));

// Public fetch
router.get('/content', async (req, res) => {
  let content = await HomepageContent.findOne();
  if (!content) content = await HomepageContent.create({ body: '' });
  res.json(content);
});

router.get('/carousel', async (req, res) => {
  const items = await CarouselItem.find({ active: true }).sort({ index: 1, createdAt: 1 });
  res.json(items);
});

export default router;
