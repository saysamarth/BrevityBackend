const { default: mongoose } = require("mongoose");

const articleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    url: {
        type: String,
        required: true,
        trim: true,
    },
    urlToImage: {
        type: String,
        required: true,
        trim: true,
    },
    publishedAt: {
        type: Date,
        required: true
    },
    sourceName : {
        type: String,
        required: true,
        trim: true,
    },
    author: {
        type: String,
        trim: true,
    },
    content: {
        type: String,
        required: true
    }
});

// Create unique index on URL to prevent duplicate articles
articleSchema.index({ url: 1 }, { unique: true });

articleSchema.virtual("timeAgo").get(function () {
    const now = new Date();
    const diffInSeconds = Math.floor((now - this.publishedAt) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return `${Math.floor(diffInDays / 7)} weeks ago`;
});

articleSchema.pre("save", function (next) {
    if (this.isNew) {
        this.publishedAt = new Date(this.publishedAt);
    }
    next();
});

module.exports = mongoose.model("Article", articleSchema);