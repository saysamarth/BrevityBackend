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
    bookmarked: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }],
    reactions: {
        likes: [{
            articleId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Article',
                required: true
            },
            likedAt: {
                type: Date,
                default: Date.now
            }
        }],
        dislikes: [{
            articleId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Article',
                required: true
            },
            dislikedAt: {
                type: Date,
                default: Date.now
            }
        }]
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
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

// Instance method to add bookmark
userSchema.methods.addBookmark = function (articleId) {
    if (!this.bookmarked.includes(articleId)) {
        this.bookmarked.push(articleId);
    }
    return this.save();
};

// Instance method to remove bookmark
userSchema.methods.removeBookmark = function (articleId) {
    this.bookmarked = this.bookmarked.filter(id => !id.equals(articleId));
    return this.save();
};

// Instance method to check if article is bookmarked
userSchema.methods.isBookmarked = function (articleId) {
    return this.bookmarked.some(id => id.equals(articleId));
};

// Instance methods to add like 
userSchema.methods.addLike = function (articleId) {
    // Remove any existing dislike first
    const hadDislike = this.reactions.dislikes.some(dislike => dislike.articleId.equals(articleId));
    if (hadDislike) {
        this.reactions.dislikes = this.reactions.dislikes.filter(dislike => !dislike.articleId.equals(articleId));
    }
    
    // Add like if it doesn't already exist
    const hasLike = this.reactions.likes.some(like => like.articleId.equals(articleId));
    if (!hasLike) {
        this.reactions.likes.push({ articleId });
    }
    
    return this.save();
};

// Instance methods to remove like
userSchema.methods.removeLike = function (articleId) {
    this.reactions.likes = this.reactions.likes.filter(like => !like.articleId.equals(articleId));
    return this.save();
};

// Instance methods to add dislike
userSchema.methods.addDislike = function (articleId) {
    // Remove any existing like first
    const hadLike = this.reactions.likes.some(like => like.articleId.equals(articleId));
    if (hadLike) {
        this.reactions.likes = this.reactions.likes.filter(like => !like.articleId.equals(articleId));
    }
    
    // Add dislike if it doesn't already exist
    const hasDislike = this.reactions.dislikes.some(dislike => dislike.articleId.equals(articleId));
    if (!hasDislike) {
        this.reactions.dislikes.push({ articleId });
    }
    
    return this.save();
};

// Instance methods to remove dislike
userSchema.methods.removeDislike = function (articleId) {
    this.reactions.dislikes = this.reactions.dislikes.filter(dislike => !dislike.articleId.equals(articleId));
    return this.save();
};

// Instance methods to fetch all reactions with populated article details
userSchema.methods.getReactedNews = async function() {
    await this.populate([
        {
            path: 'reactions.likes.articleId',
        },
        {
            path: 'reactions.dislikes.articleId', 
        }
    ]);

    const likedNews = this.reactions.likes
        .filter(like => like.articleId) // Filter out any null references
        .map(like => ({
            articleId: like.articleId._id ? like.articleId._id.toString() : undefined,
            headline: like.articleId.title,
            source: like.articleId.sourceName,
            description: like.articleId.description,
            url: like.articleId.url,
            publishedAt: like.articleId.publishedAt,
            reactionType: 'like',
            reactedAt: like.likedAt
        }));

    const dislikedNews = this.reactions.dislikes
        .filter(dislike => dislike.articleId) // Filter out any null references
        .map(dislike => ({
            articleId: dislike.articleId._id ? dislike.articleId._id.toString() : undefined,
            headline: dislike.articleId.title,
            source: dislike.articleId.sourceName, 
            description: dislike.articleId.description,
            url: dislike.articleId.url,
            publishedAt: dislike.articleId.publishedAt,
            reactionType: 'dislike',
            reactedAt: dislike.dislikedAt
        }));

    return {
        totalLikes: likedNews.length,
        totalDislikes: dislikedNews.length,
        totalReactions: likedNews.length + dislikedNews.length,
        reactions: [...likedNews, ...dislikedNews].sort((a, b) => b.reactedAt - a.reactedAt)
    };
};

module.exports = mongoose.model('User', userSchema);