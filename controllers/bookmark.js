const Article = require('../models/article');
const User = require('../models/user');

const getBookmarks = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Find user with populated bookmarked articles
        const user = await User.findById(userId)
            .populate({
                path: 'bookmarked',
                options: { sort: { publishedAt: -1 } }
            })
            .select('bookmarked');

        if (!user || !user.bookmarked.length) {
            return res.status(404).json({ message: "No bookmarks found" });
        }

        const response = user.bookmarked.map(article => ({
            ...article.toObject(),
            timeAgo: article.timeAgo,
        }));

        res.json(response);
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const toggleBookmark = async (req, res) => {
    try {
        const { title, description, url, urlToImage, publishedAt, sourceName, author, content } = req.body;
        const userId = req.user._id;

        // Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if article already exists
        let article = await Article.findOne({ url });

        if (!article) {
            // Create new article if it doesn't exist
            article = await Article.create({
                title,
                description,
                url,
                urlToImage,
                publishedAt,
                sourceName,
                author,
                content
            });
        }

        // Toggle bookmark using the user model methods
        if (user.isBookmarked(article._id)) {
            await user.removeBookmark(article._id);
            return res.json({ message: "Bookmark removed" });
        } else {
            await user.addBookmark(article._id);
            
            res.status(201).json({
                message: "Bookmark added",
                article: {
                    ...article.toObject(),
                    timeAgo: article.timeAgo,
                }
            });
        }
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { getBookmarks, toggleBookmark };
