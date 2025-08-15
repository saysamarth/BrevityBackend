const express = require('express');
const { authMiddleware, authMiddlewareAllowUnverified } = require('../middleware/auth');
const { upload } = require('../services/cloudinary');
const {
    register,
    login,
    logout,
    getCurrentUser,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    googleAuth
} = require('../controllers/auth');

const router = express.Router();

// Updated Google OAuth route for Android - accepts ID token in POST request
router.post('/google', googleAuth);

// Regular authentication routes
router.post('/register', upload.single('profileImage'), register);
router.post('/resend-verification', resendVerification);
router.get('/verify-email', verifyEmail);
router.post('/login', login);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddlewareAllowUnverified, getCurrentUser);

module.exports = router;