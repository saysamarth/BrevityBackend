const axios = require('axios');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_BASE_URL = 'https://newsapi.org/v2';

// Create axios instance with proper headers to avoid Cloudflare blocking
const newsApiClient = axios.create({
    baseURL: NEWS_BASE_URL,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
    },
    timeout: 30000, // 30 seconds timeout
});

// Add retry mechanism with exponential backoff
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to handle API requests with retry logic
const makeNewsRequest = async (endpoint, params, retries = 3) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Add API key to params
            const requestParams = {
                ...params,
                apiKey: NEWS_API_KEY
            };

            const response = await newsApiClient.get(endpoint, {
                params: requestParams,
                // Rotate User-Agent on retries
                headers: attempt > 1 ? {
                    'User-Agent': getUserAgent(attempt)
                } : {}
            });

            return response.data;
        } catch (error) {
            console.error(`News API Error (Attempt ${attempt}):`, error.response?.data || error.message);

            // If it's a Cloudflare challenge or rate limit, wait before retry
            if (error.response?.status === 403 ||
                error.response?.status === 429 ||
                error.code === 'ECONNRESET' ||
                (error.response?.data && typeof error.response.data === 'string' &&
                    error.response.data.includes('cloudflare'))) {

                if (attempt < retries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.log(`Waiting ${waitTime}ms before retry...`);
                    await delay(waitTime);
                    continue;
                }
            }

            // If it's the last attempt or a different error, throw
            if (attempt === retries) {
                throw {
                    status: error.response?.status || 500,
                    message: getErrorMessage(error),
                    isCloudflareIssue: isCloudflareError(error)
                };
            }
        }
    }
};

// Get different User-Agent strings for rotation
const getUserAgent = (attempt) => {
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0'
    ];
    return userAgents[(attempt - 1) % userAgents.length];
};

// Check if error is Cloudflare related
const isCloudflareError = (error) => {
    const response = error.response;
    if (!response) return false;

    const data = response.data;
    if (typeof data === 'string') {
        return data.includes('cloudflare') ||
            data.includes('Just a moment') ||
            data.includes('Enable JavaScript and cookies');
    }

    return response.status === 403 || response.status === 429;
};

// Get user-friendly error messages
const getErrorMessage = (error) => {
    if (isCloudflareError(error)) {
        return 'News service is temporarily blocking requests. This usually resolves automatically. Please try again in a few minutes.';
    }

    const status = error.response?.status;
    switch (status) {
        case 400:
            return 'Invalid request parameters';
        case 401:
            return 'Invalid API key';
        case 429:
            return 'Rate limit exceeded. Please try again later.';
        case 500:
            return 'News service is temporarily unavailable';
        default:
            return error.message || 'Unknown error occurred';
    }
};

// Fetch trending news
const getTrendingNews = async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;

        const data = await makeNewsRequest('/top-headlines', {
            country: 'us',
            category: 'general',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            error: 'Failed to fetch trending news',
            message: error.message,
            isCloudflareIssue: error.isCloudflareIssue || false,
            retryAfter: error.isCloudflareIssue ? 300 : 60 // seconds
        });
    }
};

// Fetch news by category
const getNewsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, pageSize = 10 } = req.query;

        const data = await makeNewsRequest('/top-headlines', {
            country: 'us',
            category: category,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            error: `Failed to fetch ${req.params.category} news`,
            message: error.message,
            isCloudflareIssue: error.isCloudflareIssue || false,
            retryAfter: error.isCloudflareIssue ? 300 : 60
        });
    }
};

// Fetch general news
const getGeneralNews = async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;

        const data = await makeNewsRequest('/top-headlines', {
            country: 'us',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            error: 'Failed to fetch general news',
            message: error.message,
            isCloudflareIssue: error.isCloudflareIssue || false,
            retryAfter: error.isCloudflareIssue ? 300 : 60
        });
    }
};

// Fetch politics news using everything endpoint
const getPoliticsNews = async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;

        const data = await makeNewsRequest('/everything', {
            q: 'politics',
            language: 'en',
            sortBy: 'publishedAt',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            error: 'Failed to fetch politics news',
            message: error.message,
            isCloudflareIssue: error.isCloudflareIssue || false,
            retryAfter: error.isCloudflareIssue ? 300 : 60
        });
    }
};

// Search news
const searchNews = async (req, res) => {
    try {
        const { q: query, page = 1, pageSize = 10 } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const data = await makeNewsRequest('/everything', {
            q: query,
            language: 'en',
            sortBy: 'relevancy',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({
            success: true,
            data: data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            error: 'Failed to search news',
            message: error.message,
            isCloudflareIssue: error.isCloudflareIssue || false,
            retryAfter: error.isCloudflareIssue ? 300 : 60
        });
    }
};

module.exports = {
    getTrendingNews,
    getNewsByCategory,
    getGeneralNews,
    getPoliticsNews,
    searchNews
};