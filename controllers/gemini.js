const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Rate limiting store (in production, consider using Redis)
const rateLimitStore = new Map();

// Simple rate limiter middleware
const rateLimit = (maxRequests = 60, timeWindowMs = 60000) => {
    return (req, res, next) => {
        const clientId = req.user?.id || req.ip || 'default';
        const now = Date.now();

        if (!rateLimitStore.has(clientId)) {
            rateLimitStore.set(clientId, []);
        }

        const requests = rateLimitStore.get(clientId);

        // Remove old requests outside the time window
        const validRequests = requests.filter(time => now - time < timeWindowMs);

        if (validRequests.length >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                message: `Maximum ${maxRequests} requests per ${timeWindowMs / 1000} seconds`
            });
        }

        validRequests.push(now);
        rateLimitStore.set(clientId, validRequests);

        next();
    };
};

// Generate content using Gemini API
const generateContent = async (req, res) => {
    try {
        const { input, prompt } = req.body;
        const userId = req.user?.id;

        if (!input && !prompt) {
            return res.status(400).json({
                success: false,
                error: 'Input or prompt is required'
            });
        }

        const textInput = input || prompt;

        // Compress and clean the prompt
        const compressedPrompt = textInput.replace(/\s+/g, ' ').trim();

        const payload = {
            contents: [{
                parts: [{ text: compressedPrompt }]
            }],
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        };

        const response = await axios.post(
            `${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 seconds
            }
        );

        // Process the response
        const data = response.data;
        if (data.candidates?.length > 0 &&
            data.candidates[0].content?.parts?.length > 0) {
            const generatedText = data.candidates[0].content.parts[0].text;

            res.json({
                success: true,
                data: {
                    text: generatedText,
                    model: GEMINI_MODEL,
                    userId: userId
                },
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Empty response from Gemini API',
                message: 'No content generated'
            });
        }

    } catch (error) {
        console.error('Gemini API Error:', error.response?.data || error.message);

        // Handle specific error codes
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            switch (status) {
                case 429:
                    res.status(429).json({
                        success: false,
                        error: 'Rate limit exceeded',
                        message: 'Gemini API rate limit exceeded. Please try again later.'
                    });
                    break;
                case 403:
                    res.status(403).json({
                        success: false,
                        error: 'API key quota exceeded',
                        message: 'Gemini API quota exceeded.'
                    });
                    break;
                case 400:
                    res.status(400).json({
                        success: false,
                        error: 'Invalid request',
                        message: errorData?.error?.message || 'Bad request to Gemini API'
                    });
                    break;
                default:
                    res.status(500).json({
                        success: false,
                        error: 'Gemini API error',
                        message: errorData?.error?.message || error.message
                    });
            }
        } else if (error.code === 'ECONNABORTED') {
            res.status(408).json({
                success: false,
                error: 'Request timeout',
                message: 'Request to Gemini API timed out'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: 'Failed to process request'
            });
        }
    }
};

// Health check for Gemini service
const getGeminiHealth = async (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        message: 'Gemini API service is running',
        data: {
            model: GEMINI_MODEL,
            hasApiKey: !!GEMINI_API_KEY
        },
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    generateContent,
    getGeminiHealth,
    rateLimit
};