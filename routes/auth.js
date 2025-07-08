const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../services/cloudinary');
const {
    register,
    login,
    logout,
    getCurrentUser
} = require('../controllers/auth');

const router = express.Router();

// Routes
router.post('/register', upload.single('profileImage'), register);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;