// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// ให้ไฟล์นี้ connect MongoDB
require('./config/db.js');

// import routes
const adminRoutes = require('./routes/admin.js');
const authRoutes = require('./routes/auth.js');
const userRoutes = require('./routes/users.js');        // ⭐ เพิ่มบรรทัดนี้
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

// health check
app.get('/healthz', (_req, res) => {
  res.json({ ok: true });
});

// ใช้งาน routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);         // ⭐ ใช้ได้แล้ว
app.use('/api/homepage', homepageRoutes);  // ถ้ามี route นี้

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});