// /backend/server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import homepageRoutes from './routes/homepage.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 1) DB =====
connectDB();

// ===== 2) Proxy/HTTPS (สำคัญบน Render) =====
app.set('trust proxy', 1);

// ===== 3) CORS (อนุญาต cookie + origin ที่กำหนด) =====
const allowOrigins = [process.env.FRONTEND_URL, process.env.SERVER_URL].filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // อนุญาต: ไม่มี origin (เช่น curl) หรืออยู่ใน allowOrigins
      if (!origin || allowOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// (ไม่ต้องใช้ app.options('/api/*', ...) เพราะ path-to-regexp v6 ไม่รองรับรูปแบบนั้นแล้ว)

// ===== 4) Common middleware =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ใช้เฉพาะช่วยใน OAuth flow (มีคำเตือน MemoryStore ใน production ได้ ปลอดภัยต่อการทำงาน)
// ถ้าต้องการ production-hardening ให้เปลี่ยนเป็น store เช่น Redis
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'session-secret',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    },
  })
);

app.use(passport.initialize());

// ===== 5) Static uploads (รูปโปรไฟล์/ไฟล์ที่อัปโหลด) =====
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== 6) API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Health check (สำหรับ Render)
app.get('/healthz', (req, res) => res.status(200).send('ok'));

// ===== 7) Serve Frontend (production เท่านั้น) =====
if (process.env.NODE_ENV === 'production') {
  const fe = path.join(__dirname, '../frontend');

  // เสิร์ฟ asset ทั้งหมด (css/js/images/html) จากโฟลเดอร์ frontend
  app.use(express.static(fe));

  // ระบุเพจที่มีแน่ ๆ แบบเจาะจง (หลีกเลี่ยง wildcard *)
  const pages = [
    '/', '/index.html',
    '/register.html',
    '/check.html',
    '/form.html',
    '/login.html',
    '/reset.html',
    '/home.html',
    '/settings.html',
    '/admin.html',
    '/about.html',
    '/contact.html',
  ];

  app.get(pages, (req, res) => {
    const file = req.path === '/' ? 'index.html' : req.path.replace(/^\//, '');
    res.sendFile(path.join(fe, file));
  });

  // เส้นทาง asset ย่อยแบบเจาะโฟลเดอร์ (กัน proxy แปลก ๆ)
  app.get(['/css/:file', '/js/:file', '/images/:file'], (req, res) => {
    res.sendFile(path.join(fe, req.path));
  });
}

// ===== 8) Start =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('✅ Server running on port', PORT);
});
