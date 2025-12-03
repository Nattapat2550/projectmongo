// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

require('./config/db.js');

const adminRoutes = require('./routes/admin.js');
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');
const homepageRoutes = require('./routes/homepage.js');   // ถ้ามีใช้อยู่
const carouselRoutes = require('./routes/carousel.js');   // ⭐ เพิ่มบรรทัดนี้

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// ใช้งาน routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/homepage', homepageRoutes);   // ถ้ามี
app.use('/api/carousel', carouselRoutes);   // ⭐ ตรงนี้คือ /api/carousel

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
