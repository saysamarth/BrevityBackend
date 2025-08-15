const User = require('../models/user');
const { generateTokens } = require('../services/jwt');
const { sendEmail } = require('../services/email.service');
const { jwt, decode } = require('jsonwebtoken');
const { verifyGoogleToken } = require('../config/passport');

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

        const emailVerificationToken = await user.generateEmailVerificationToken();

        await sendEmail({
            to: user.email,
            subject: 'Email Verification',
            userName: user.displayName,
            url: emailVerificationToken,
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
        if (!user.emailVerified) {
            return res.status(401).json({
                success: false,
                message: 'Please verify your email to activate your account'
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

// Forgot password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email'
            });
        }

        const resetToken = await user.generatePasswordResetToken();
        await user.save();

        await sendEmail({
            to: user.email,
            subject: 'Password Reset',
            userName: user.displayName,
            token: resetToken,
        });

        return res.status(200).json({
            success: true,
            message: 'Password reset link sent to your email'
        });

    } catch (error) {
        console.error('Forgot password error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send password reset email',
            error: error.message
        });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, token, and new password are required'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email'
            });
        }

        const isValidToken = await user.comparePasswordResetToken(token);

        if (!isValidToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired password reset token'
            });
        }

        if (Date.now() > user.passwordResetExpires) {
            return res.status(400).json({
                success: false,
                message: 'Password reset token has expired'
            });
        }

        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        await sendEmail({
            to: user.email,
            subject: 'Password Reset Successful',
            userName: user.displayName
        });

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
}

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required for email verification'
            });
        }
        const { email, emailVerificationToken } = decode(token);
        if (!email || !emailVerificationToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token format'
            });
        }

        const user = await User.findOne({ email, emailVerificationToken });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found or token is invalid'
            });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        await user.save();

        res.status(200).send(
            require('../helper/html.helper').html(user.displayName)
        )
    }
    catch (error) {
        console.error('Email verification error:', error.message);
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired email verification token'
        });
    }
}

const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found with this email'
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: 'Email is already verified'
            });
        }

        const emailVerificationToken = await user.generateEmailVerificationToken();

        await sendEmail({
            to: user.email,
            subject: 'Resend Email Verification',
            userName: user.displayName,
            url: emailVerificationToken,
        });
        res.status(200).json({
            success: true,
            message: 'Verification email sent successfully'
        });
    }
    catch (error) {
        console.error('Resend verification error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to resend verification email',
            error: error.message
        });
    }
}

// Updated Google authentication for Android - handles ID token verification
const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'Google ID token is required'
            });
        }

        // Verify the Google ID token
        const googleUser = await verifyGoogleToken(idToken);

        // Check if user exists
        let user = await User.findOne({ email: googleUser.email });

        if (!user) {
            // Create new user if doesn't exist
            user = new User({
                displayName: googleUser.name,
                email: googleUser.email,
                emailVerified: googleUser.emailVerified,
                profileImage: { url: googleUser.picture },
                password: Math.random().toString(36), // Dummy password for Google users
            });
            await user.save();
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
            message: 'Google login successful',
            data: {
                user: userData,
                accessToken,
                refreshToken
            }
        });

    } catch (error) {
        console.error('Google authentication error:', error);
        res.status(500).json({
            success: false,
            message: 'Google authentication failed',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    getCurrentUser,
    verifyEmail,
    resendVerification,
    googleAuth
};