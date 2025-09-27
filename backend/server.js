require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Optional: Redis for sessions (uncomment if REDIS_URL set in Render)
// const RedisStore = require('connect-redis').default;
// const { createClient } = require('redis');
// (require('redis').createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' })).connect();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const homepageRoutes = require('./routes/homepage');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Fallback secrets (replace with real env vars in Render)
const sessionSecret = process.env.SESSION_SECRET || 'fallback-session-secret-change-me';
const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-change-me';

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session setup (MemoryStore OK for low traffic; Redis for scale)
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 
  },
  name: 'projectmongo.sid'
}));

// API Routes (must come before static/catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Serve static frontend in production (SPA mode)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  
  // FIXED: Named catch-all for modern path-to-regexp v6+ (avoids "missing param name" error)
  // Matches any GET path (e.g., /, /register.html, /admin/anything) and serves index.html for routing
  app.get('/:path(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  });
}

// Global 404 handler for unmatched API routes (after all routes)
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Start server after DB connection
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 Frontend served from: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🔗 API base: ${process.env.SERVER_URL || 'http://localhost:' + PORT}/api`);
    });

    // Graceful shutdown for Render restarts
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();