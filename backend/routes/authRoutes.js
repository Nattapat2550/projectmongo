const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Register
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Google OAuth
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleAuthCallback);

// Logout
router.post('/logout', authController.logout);

module.exports = router;