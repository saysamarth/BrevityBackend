const User = require('../models/user');
const Article = require('../models/article');

const addLike = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title,
            description,
            sourceName,
            url,
            urlToImage,
            publishedAt,
            author,
            content
        } = req.body;

        // Find or create the article
        let article = await Article.findOne({ url });
        if (!article) {
            article = new Article({
                title,
                description,
                sourceName,
                url,
                urlToImage,
                publishedAt: new Date(publishedAt),
                author,
                content
            });
            await article.save();
        }

        // Find user and use existing addLike method
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updatedUser = await user.addLike(article._id);

        res.status(200).json({
            success: true,
            message: 'Article liked successfully',
            data: {
                articleId: article._id,
                totalLikes: updatedUser.reactions.likes.length,
                totalDislikes: updatedUser.reactions.dislikes.length
            }
        });

    } catch (error) {
        console.error('Add like error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const addDislike = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title,
            description,
            sourceName,
            url,
            urlToImage,
            publishedAt,
            author,
            content
        } = req.body;

        // Find or create the article
        let article = await Article.findOne({ url });
        if (!article) {
            article = new Article({
                title,
                description,
                sourceName,
                url,
                urlToImage,
                publishedAt: new Date(publishedAt),
                author,
                content
            });
            await article.save();
        }

        // Find user and use existing addDislike method
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updatedUser = await user.addDislike(article._id);

        res.status(200).json({
            success: true,
            message: 'Article disliked successfully',
            data: {
                articleId: article._id,
                totalLikes: updatedUser.reactions.likes.length,
                totalDislikes: updatedUser.reactions.dislikes.length
            }
        });

    } catch (error) {
        console.error('Add dislike error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getReactedNews = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type = 'all', limit = 50, skip = 0 } = req.query;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get reacted news with populated article details
        const reactedData = await user.getReactedNews();

        // Filter by reaction type if specified
        let filteredReactions = reactedData.reactions;
        if (type !== 'all') {
            filteredReactions = reactedData.reactions.filter(reaction => 
                reaction.reactionType === type
            );
        }

        // Apply pagination
        const paginatedReactions = filteredReactions.slice(
            parseInt(skip), 
            parseInt(skip) + parseInt(limit)
        );

        // Check if user has enough likes for AI analysis (threshold: 10)
        const readyForAIAnalysis = reactedData.totalLikes >= 10;

        res.status(200).json({
            success: true,
            message: 'Reacted news fetched successfully',
            data: {
                totalReactions: filteredReactions.length,
                totalLikes: reactedData.totalLikes,
                totalDislikes: reactedData.totalDislikes,
                readyForAIAnalysis,
                pagination: {
                    limit: parseInt(limit),
                    skip: parseInt(skip),
                    hasMore: filteredReactions.length > parseInt(skip) + parseInt(limit)
                },
                reactions: paginatedReactions
            }
        });

    } catch (error) {
        console.error('Get reacted news error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const removeLike = async (req, res) => {
    try {
        const userId = req.user.id;
        const { articleId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updatedUser = await user.removeLike(articleId);

        res.status(200).json({
            success: true,
            message: 'Like removed successfully',
            data: {
                articleId,
                totalLikes: updatedUser.reactions.likes.length,
                totalDislikes: updatedUser.reactions.dislikes.length
            }
        });

    } catch (error) {
        console.error('Remove like error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const removeDislike = async (req, res) => {
    try {
        const userId = req.user.id;
        const { articleId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updatedUser = await user.removeDislike(articleId);

        res.status(200).json({
            success: true,
            message: 'Dislike removed successfully',
            data: {
                articleId,
                totalLikes: updatedUser.reactions.likes.length,
                totalDislikes: updatedUser.reactions.dislikes.length
            }
        });

    } catch (error) {
        console.error('Remove dislike error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    addLike,
    addDislike,
    getReactedNews,
    removeLike,
    removeDislike
};
