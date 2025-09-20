const mongoose = require('mongoose');

const jwtBlacklistSchema = new mongoose.Schema({
    jti: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    },
    reason: {
        type: String,
        enum: ['logout', 'account_deletion', 'manual_revocation'],
        default: 'manual_revocation'
    },
    blacklistedAt: {
        type: Date,
        default: Date.now
    }
});

jwtBlacklistSchema.index({ jti: 1 });
jwtBlacklistSchema.index({ userId: 1 });

module.exports = mongoose.model('JwtBlacklist', jwtBlacklistSchema);
