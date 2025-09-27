const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs'); // For file existence checks in fallback
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const homepageRoutes = require('./routes/homepage');

const app = express();

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS setup for credentials (allows frontend to send cookies)
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve frontend statically (handles direct file access like /register.html)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes (must be before fallback)
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Root route: Serve index.html for home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Fallback/404 middleware (no path specifier = runs for all unmatched requests; avoids * wildcard bug)
// Placed AFTER static and routes, so only triggers for truly unknown paths
app.use((req, res, next) => {
  // If API path and unmatched, return JSON 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, message: 'API endpoint not found' });
  }

  // For non-API: Try to serve exact file if exists (enhances static for .html extensions)
  let filePath = path.join(__dirname, '../frontend', req.path);
  if (req.path.endsWith('.html')) {
    filePath = path.join(__dirname, '../frontend', req.path);
  } else if (req.path === '/') {
    filePath = path.join(__dirname, '../frontend/index.html');
  } else {
    // For non-HTML paths, append .html if file exists (e.g., /home → /home.html)
    const htmlPath = path.join(__dirname, '../frontend', req.path + '.html');
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    } else {
      // Ultimate fallback: index.html for SPA-like routing (optional; remove if strict multi-page)
      filePath = path.join(__dirname, '../frontend/index.html');
    }
  }

  // Serve if file exists
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // True 404 if nothing matches
  res.status(404).json({ ok: false, message: 'Page not found' });
});

// Global error handler (for server errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ ok: false, message: err.message || 'Internal server error' });
});

// Connect DB and start server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to DB:', err);
  process.exit(1);
});