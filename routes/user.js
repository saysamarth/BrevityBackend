const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../services/cloudinary');
const {
    updateProfile,
    deleteProfileImage
} = require('../controllers/user');

const router = express.Router();

// Routes
router.put('/profile', authMiddleware, upload.single('profileImage'), updateProfile);
router.delete('/profile/image', authMiddleware, deleteProfileImage);

module.exports = router;