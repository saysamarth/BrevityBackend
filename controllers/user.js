const User = require('../models/user');
const { deleteImage } = require('../services/cloudinary');

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const { displayName } = req.body;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update display name if provided
        if (displayName !== undefined) {
            user.displayName = displayName;
        }

        // Handle profile image update
        if (req.file) {
            // Delete old image if exists
            if (user.profileImage?.publicId) {
                try {
                    await deleteImage(user.profileImage.publicId);
                } catch (error) {
                    console.error('Error deleting old profile image:', error);
                }
            }

            // Set new image
            user.profileImage = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        await user.save();

        // Return updated user data
        const updatedUser = await User.findById(userId).select('-password -refreshTokens');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { user: updatedUser }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// Delete profile image
const deleteProfileImage = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.profileImage?.publicId) {
            return res.status(400).json({
                success: false,
                message: 'No profile image to delete'
            });
        }

        // Delete image from Cloudinary
        try {
            await deleteImage(user.profileImage.publicId);
        } catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
        }

        // Remove image from user document
        user.profileImage = undefined;
        await user.save();

        res.json({
            success: true,
            message: 'Profile image deleted successfully'
        });

    } catch (error) {
        console.error('Delete profile image error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete profile image',
            error: error.message
        });
    }
};

module.exports = {
    updateProfile,
    deleteProfileImage
};