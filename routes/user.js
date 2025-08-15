const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { upload } = require('../services/cloudinary');
const {
    updateProfile,
    deleteProfileImage,
    deleteUserAccount
} = require('../controllers/user');

const router = express.Router();

// Routes
router.put('/profile', authMiddleware, upload.single('profileImage'), updateProfile);
router.delete('/profile/image', authMiddleware, deleteProfileImage);
router.delete('/deleteAccount', authMiddleware, deleteUserAccount);

module.exports = router;