const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateJWT = require('../middlewares/authMiddleware');

// Get user profile
router.get('/profile', authenticateJWT, userController.getProfile);

// Update username
router.put('/update-name', authenticateJWT, userController.updateName);

// Upload profile picture
router.post('/upload-profile-picture', authenticateJWT, userController.uploadProfilePicture);

// Delete account
router.delete('/delete-account', authenticateJWT, userController.deleteAccount);

module.exports = router;