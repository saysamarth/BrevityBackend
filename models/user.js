const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { encode } = require('../helper/jwt.helper');

const userSchema = new mongoose.Schema({
    displayName: {
        type: String,
        required: [true, 'Display name is required'],
        trim: true,
        maxlength: [50, 'Display name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
            'Please enter a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't include password in queries by default
    },
    profileImage: {
        url: String,
        publicId: String // Cloudinary public ID for deletion
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,
    refreshTokens: [{
        token: String,
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 2592000 // 30 days
        }
    }],
    lastLogin: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ emailVerificationToken: 1 });
userSchema.index({ passwordResetToken: 1 });

// Virtual for account lock status
userSchema.virtual('isLocked').get(function () {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Update updatedAt before saving
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = async function () {
    const rawToken = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.passwordResetToken = await bcrypt.hash(rawToken, salt);
    this.passwordResetExpires = Date.now() + 3600000; // 1 hour
    return rawToken; // Return the raw token for sending in email
};

// Instance method to verify password reset token
userSchema.methods.comparePasswordResetToken = async function (token) {
    return await bcrypt.compare(token, this.passwordResetToken);
}

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = async function () {
    if(!this.emailVerificationToken) {
        const token = require('crypto').randomBytes(32).toString('hex');
        this.emailVerificationToken = token;
        await this.save();
    }
    const returnToken = encode({
        email: this.email,
        emailVerificationToken: this.emailVerificationToken
    });
    return returnToken;
}

// Instance method to handle failed login attempts
userSchema.methods.incLoginAttempts = function () {
    // Clear attempts if lock has expired
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockTime = parseInt(process.env.LOCK_TIME) || 30; // minutes

    // Lock account after max attempts
    if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + lockTime * 60 * 1000 };
    }

    return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
    return this.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
    });
};

module.exports = mongoose.model('User', userSchema);