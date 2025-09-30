import 'dotenv/config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminRoutes from './routes/admin.js';
import homepageRoutes from './routes/homepage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// DB
await connectDB(process.env.MONGODB_URI);

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

app.use(cors({
  origin: [FRONTEND_URL, SERVER_URL],
  credentials: true
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sessionsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(passport.initialize());

// Static: uploads (user avatars)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Serve frontend in production
const frontendDir = path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Explicit file routes (no wildcard to avoid path-to-regexp issue)
const pages = [
  '/', '/index.html',
  '/register.html', '/check.html', '/form.html', '/login.html', '/reset.html',
  '/home.html', '/settings.html', '/admin.html',
  '/about.html', '/contact.html'
];
pages.forEach(route => {
  app.get(route, (req, res) => {
    const file = route === '/' ? 'index.html' : route.replace(/^\//, '');
    res.sendFile(path.join(frontendDir, file));
  });
});

// Fallback for assets in frontend (css/js/images)
app.get(['/css/style.css', '/js/:f', '/images/:f'], (req, res) => {
  res.sendFile(path.join(frontendDir, req.path));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port', PORT);
});
