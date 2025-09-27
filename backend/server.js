require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Optional: Redis for sessions (uncomment if you add REDIS_URL in Render)
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

// Fallback secrets (ensure real ones are in Render env vars)
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

// Session setup (MemoryStore for now; switch to Redis for prod scale)
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
  name: 'projectmongo.sid'  // Avoids default session name conflicts
}));

// API Routes (mount before static files)
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Serve static frontend in production (SPA mode)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  
  // FIXED: Catch-all for client-side routing (use '/*' to avoid PathError)
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  });
}

// 404 for API routes (optional, but good practice)
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server after DB connection
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`📡 Frontend served from: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Graceful shutdown
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