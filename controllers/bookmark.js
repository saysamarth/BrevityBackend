import Article from '../models/article.js';

const getBookmarks = async (req, res) => {
    try {
        const userId = req.user._id;
        const bookmarks = await Article.find({ userId }).sort({ publishedAt: -1 }).select('-userId -__v -_id');

        if (!bookmarks.length) {
            return res.status(404).json({ message: "No bookmarks found" });
        }

        const response = bookmarks.map(article => ({
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

        const existing = await Article.findOne({ url, userId });

        if (existing) {
            await existing.deleteOne();
            return res.json({ message: "Bookmark removed" });
        }

        const article = await Article.create({
            title,
            description,
            url,
            urlToImage,
            publishedAt,
            sourceName,
            author,
            content,
            userId
        });

        res.status(201).json({
            message: "Bookmark added",
            article: {
                ...article.toObject(),
                timeAgo: article.timeAgo,
            }
        });
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export { getBookmarks, toggleBookmark };
