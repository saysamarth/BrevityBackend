const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { generateContent, getGeminiHealth, rateLimit } = require('../controllers/gemini');

const router = express.Router();

// Generate content using Gemini API (requires authentication)
router.post('/generate', authMiddleware, rateLimit(60, 60000), generateContent);

// Health check for Gemini service (public)
router.get('/health', getGeminiHealth);

module.exports = router;

module.exports = router;
