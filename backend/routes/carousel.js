// backend/routes/carousel.js
const express = require('express');
const Homepage = require('../models/homepage');

const router = express.Router();

/**
 * GET /api/carousel
 * Public: ใช้บนหน้า home แสดงสไลด์
 */
router.get('/', async (req, res) => {
  try {
    // หา document homepage ตัวเดียว (เราออกแบบให้มีแค่ 1 record)
    const homepage = await Homepage.findOne();

    if (!homepage || !Array.isArray(homepage.carousel)) {
      // ถ้ายังไม่มีข้อมูลเลย ก็ส่ง array ว่าง ๆ กลับไป
      return res.json([]);
    }

    // filter เฉพาะสไลด์ที่ active === true (ถ้ามี field นี้)
    const activeSlides = homepage.carousel.filter(slide => {
      if (typeof slide.active === 'boolean') return slide.active;
      return true;
    });

    // เรียงตาม index (ถ้าไม่มี ให้ถือเป็น 0)
    const slides = activeSlides.sort((a, b) => {
      const ai = typeof a.index === 'number' ? a.index : 0;
      const bi = typeof b.index === 'number' ? b.index : 0;
      return ai - bi;
    });

    // ส่งออกเป็น array ตรง ๆ ให้ frontend ใช้ง่าย
    res.json(slides);
  } catch (err) {
    console.error('GET /api/carousel error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
