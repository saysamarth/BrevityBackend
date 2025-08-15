const axios = require('axios');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_BASE_URL = 'https://newsapi.org/v2';

// Axios instance
const newsApiClient = axios.create({
    baseURL: NEWS_BASE_URL,
    headers: {
        'X-Api-Key': NEWS_API_KEY,
        'User-Agent': 'Axios/1.5.0' // simple UA
    },
    timeout: 10000
});

// Helper: Make API requests
const makeNewsRequest = async (endpoint, params = {}) => {
    try {
        const response = await newsApiClient.get(endpoint, { params });
        return response.data;
    } catch (error) {
        const status = error.response?.status;
        let message = error.message || 'Unknown error';

        if (status === 401) message = 'Invalid API key';
        if (status === 429) message = 'Rate limit exceeded';
        if (status === 500) message = 'News service temporarily unavailable';

        throw { status: status || 500, message };
    }
};

// --- Endpoints ---

// Trending news (Top Headlines)
const getTrendingNews = async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;
        const data = await makeNewsRequest('/top-headlines', {
            country: 'us',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(error.status).json({ success: false, message: error.message });
    }
};

// News by category
const getNewsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page = 1, pageSize = 10 } = req.query;
        const data = await makeNewsRequest('/top-headlines', {
            country: 'us',
            category,
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(error.status).json({ success: false, message: error.message });
    }
};

// General news
const getGeneralNews = async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;
        const data = await makeNewsRequest('/top-headlines', {
            country: 'us',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(error.status).json({ success: false, message: error.message });
    }
};

// Politics news using 'everything'
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

        res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(error.status).json({ success: false, message: error.message });
    }
};

// Search news
const searchNews = async (req, res) => {
    try {
        const { q: query, page = 1, pageSize = 10 } = req.query;

        if (!query) {
            return res.status(400).json({ success: false, message: 'Search query is required' });
        }

        const data = await makeNewsRequest('/everything', {
            q: query,
            language: 'en',
            sortBy: 'relevancy',
            page: parseInt(page),
            pageSize: parseInt(pageSize)
        });

        res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
        res.status(error.status).json({ success: false, message: error.message });
    }
};

module.exports = {
    getTrendingNews,
    getNewsByCategory,
    getGeneralNews,
    getPoliticsNews,
    searchNews
};