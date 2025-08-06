const jwt = require('jsonwebtoken');
const User = require('../models/user');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid - user not found'
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message: 'Email not verified, please verify your email to access this resource'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

// Auth middleware that allows unverified users (for checking verification status)
const authMiddlewareAllowUnverified = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided, authorization denied'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Token is not valid - user not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }

        return res.status(401).json({
            success: false,
            message: 'Token is not valid'
        });
    }
};

// Optional auth middleware (for routes that work with or without auth)
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');

        req.user = user && user.isActive ? user : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = { authMiddleware, authMiddlewareAllowUnverified, optionalAuth };