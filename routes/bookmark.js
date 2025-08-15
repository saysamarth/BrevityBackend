const express = require('express');
const { getBookmarks, toggleBookmark } = require('../controllers/bookmark');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, getBookmarks);
router.post('/', authMiddleware, toggleBookmark);

module.exports = router;