// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// connect MongoDB
require('./config/db.js');

// ⭐ เพิ่มการ import routes พวกนี้
const adminRoutes = require('./routes/admin.js');
const authRoutes = require('./routes/auth.js');       // << ต้องมี
const homepageRoutes = require('./routes/homepage.js'); // ถ้ามีไฟล์นี้

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

// healthcheck
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// ⭐ ตรงนี้สำคัญ: ผูก prefix ให้ route
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);          // << อันนี้แหละที่ทำให้ /api/auth/google ใช้ได้
app.use('/api/homepage', homepageRoutes);  // ตามโปรเจกต์เดิม

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});