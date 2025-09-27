const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs'); // Added for file existence check (optional safety)
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

// Serve frontend statically (for single-host deploys like Render)
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploads publicly
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes (must be before catch-all)
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/homepage', homepageRoutes);

// Catch-all middleware for frontend routes (SPA-like fallback to index.html)
// Fixed: Use app.use('*') to avoid path-to-regexp parsing error in Express 4.19+
app.use('*', (req, res) => {
  // Safety: If it's an API path, return 404 (routes above should catch real APIs)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, message: 'API endpoint not found' });
  }
  // Optional: Check if file exists (for direct HTML access; static middleware handles known files)
  const filePath = path.join(__dirname, '../frontend', req.path === '/' ? 'index.html' : `${req.path}.html`);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  // Fallback to index.html for unknown paths
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
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