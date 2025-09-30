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
const __dirname  = path.dirname(__filename);

connectDB();
app.set('trust proxy', 1);

const allowOrigins = [process.env.FRONTEND_URL, process.env.SERVER_URL].filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'session-secret',
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

// uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// APIs
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);

// health
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

// serve frontend (production)
if (process.env.NODE_ENV === 'production') {
  const fe = path.join(__dirname, '../frontend');
  app.use(express.static(fe));

  const pages = [
    '/', '/index.html', '/register.html', '/check.html', '/form.html',
    '/login.html', '/reset.html', '/home.html', '/settings.html',
    '/admin.html', '/about.html', '/contact.html'
  ];
  app.get(pages, (req, res) => {
    const file = req.path === '/' ? 'index.html' : req.path.replace(/^\//,'');
    res.sendFile(path.join(fe, file));
  });
  app.get(['/css/:file','/js/:file','/images/:file'], (req, res) => {
    res.sendFile(path.join(fe, req.path));
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('✅ Server running on port', PORT));
