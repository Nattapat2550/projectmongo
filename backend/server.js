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

connectDB();

// สำคัญบน Render เพื่อ proxy TLS -> req.secure ทำงานถูกต้อง
app.set('trust proxy', 1);

// CORS ตรงกับโดเมนจริง และส่งคุกกี้ได้
const allowOrigins = [process.env.FRONTEND_URL, process.env.SERVER_URL].filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    // อนุญาตทั้ง frontend/backend และ local dev ที่ไม่มี origin
    if (!origin || allowOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin), false);
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Preflight เฉพาะ /api/*
app.options('/api/*', cors({
  origin: allowOrigins,
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// WARNING ของ MemoryStore ใน prod เป็นแค่คำเตือนของ express-session (ใช้เฉพาะ OAuth flow)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  }
}));

app.use(passport.initialize());

// ไฟล์อัปโหลดจาก multer
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);

// เสิร์ฟ frontend (production)
if (process.env.NODE_ENV === 'production') {
  const fe = path.join(__dirname, '../frontend');
  app.use(express.static(fe));
  // หน้าไฟล์ตรง ๆ
  app.get([
    '/', '/index.html', '/register.html', '/check.html', '/form.html',
    '/login.html', '/reset.html', '/home.html', '/settings.html',
    '/admin.html', '/about.html', '/contact.html'
  ], (req, res) => res.sendFile(path.join(fe, req.path === '/' ? 'index.html' : req.path.replace(/^\//,''))));
  // asset ภายใต้ /css /js /images
  app.get(['/css/:file', '/js/:file', '/images/:file'], (req, res) => {
    res.sendFile(path.join(fe, req.path));
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('✅ Server running on port', PORT));
