import express from 'express';
import Homepage from '../models/homepage.js';

const router = express.Router();

async function getDoc() {
  const list = await Homepage.find().limit(1);
  if (list.length) return list[0];
  return Homepage.create({ body: '', carousel: [] });
}

/* GET /api/homepage/carousel (public for home) */
router.get('/carousel', async (_req, res) => {
  const doc = await getDoc();
  const items = (doc.carousel || []).filter(i => i.active).sort((a,b)=>a.index-b.index);
  res.json(items);
});

export default router;
