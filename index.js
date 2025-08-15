require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const bookmarkRoutes = require('./routes/bookmark');
const newsRoutes = require('./routes/news');
const passport = require('passport');

// Import controllers
const { verifyEmail } = require('./controllers/auth');

// Import middleware
const { errorHandler } = require('./middleware/error');

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for Vercel
}));
app.use(compression());

// Rate limiting
app.set('trust proxy', 1);

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Database connection with better error handling for Vercel
let isConnected = false;

const connectDB = async () => {
    if (isConnected) {
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
        });
        isConnected = true;
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
};

// Connect to database
connectDB();

// Passport configuration
require('./config/passport');
app.use(passport.initialize());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/news', newsRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'NewsAI Backend is running',
        timestamp: new Date().toISOString()
    });
});

// Root route for testing
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'NewsAI Backend API',
        version: '1.0.0'
    });
});

// Email verification route
app.get('/auth/verify-email', verifyEmail);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// For Vercel serverless functions
module.exports = app;