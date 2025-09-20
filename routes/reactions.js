const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {
    addLike,
    addDislike,
    getReactedNews,
    removeLike,
    removeDislike
} = require('../controllers/reactions');

const router = express.Router();

router.post('/like', authMiddleware, addLike);
router.post('/dislike', authMiddleware, addDislike);


router.get('/reacted-news', authMiddleware, getReactedNews);

router.delete('/like/:articleId', authMiddleware, removeLike);
router.delete('/dislike/:articleId', authMiddleware, removeDislike);

module.exports = router;
