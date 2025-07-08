const User = require('../models/user');
const { generateTokens } = require('../services/jwt');

// Register user
const register = async (req, res) => {
    try {
        const { displayName, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Handle profile image if uploaded
        let profileImage = null;
        if (req.file) {
            profileImage = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        // Create user
        const user = new User({
            displayName,
            email,
            password,
            profileImage
        });

        await user.save();

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // Save refresh token to user
        user.refreshTokens.push({ token: refreshToken });
        user.lastLogin = new Date();
        await user.save();

        // Return user data (without password)
        const userData = await User.findById(user._id).select('-password -refreshTokens');

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: userData,
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password for comparison
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is locked
        if (user.isLocked) {
            return res.status(423).json({
                success: false,
                message: 'Account is temporarily locked due to too many failed login attempts'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Compare password
        const isValidPassword = await user.comparePassword(password);
        if (!isValidPassword) {
            await user.incLoginAttempts();
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Reset login attempts on successful login
        if (user.loginAttempts > 0) {
            await user.resetLoginAttempts();
        }

        // Generate tokens
        const { accessToken, refreshToken } = generateTokens(user._id);

        // Save refresh token to user
        user.refreshTokens.push({ token: refreshToken });
        user.lastLogin = new Date();
        await user.save();

        // Return user data (without password)
        const userData = await User.findById(user._id).select('-password -refreshTokens');

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: userData,
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// Logout user
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user._id;

        if (refreshToken) {
            // Remove specific refresh token
            await User.findByIdAndUpdate(userId, {
                $pull: { refreshTokens: { token: refreshToken } }
            });
        } else {
            // Remove all refresh tokens (logout from all devices)
            await User.findByIdAndUpdate(userId, {
                $set: { refreshTokens: [] }
            });
        }

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed',
            error: error.message
        });
    }
};

// Get current user
const getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -refreshTokens');

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user data',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrentUser
};