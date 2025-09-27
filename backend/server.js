require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Optional: Redis for sessions (uncomment and configure in production)
// const RedisStore = require('connect-redis').default;
// const { createClient } = require('redis');
// const redisClient = createClient({ url: process.env.REDIS_URL }); // Set REDIS_URL in Render
// redisClient.connect();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const homepageRoutes = require('./routes/homepage');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure secrets are strings (suppress deprecation)
const sessionSecret = process.env.SESSION_SECRET || 'fallback-secret-do-not-use-in-prod';
const jwtSecret = process.env.JWT_SECRET || 'fallback-jwt-secret-do-not-use-in-prod';

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000', 
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session setup (with Redis option commented)
app.use(session({
  secret: sessionSecret,  // Ensures secret is provided
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  },
  // store: new RedisStore({ client: redisClient }),  // Uncomment for Redis
  name: 'projectmongo.sid'  // Custom session cookie name to avoid conflicts
}));

// Routes (mount before static/catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  
  // Fixed: Use '/*' instead of '*' for catch-all (resolves PathError)
  app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  });
}

// Connect to DB before starting server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  // redisClient.quit().catch(console.error);  // If using Redis
  process.exit(0);
});

startServer();