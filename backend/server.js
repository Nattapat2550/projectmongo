// backend/server.js (CommonJS)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// db.js เป็น CommonJS อยู่แล้ว แค่ require ให้มัน connect
require('./config/db.js');

const adminRoutes = require('./routes/admin.js');
// ถ้ามี route อื่นก็ require เหมือนกัน เช่น:
// const authRoutes = require('./routes/auth.js');
// const homepageRoutes = require('./routes/homepage.js');

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

// routes
app.use('/api/admin', adminRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/homepage', homepageRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
