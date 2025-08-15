const axios = require('axios');

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const NEWS_BASE_URL = 'https://newsapi.org/v2';

// Helper function to handle API requests
const makeNewsRequest = async (url, params) => {
    try {
        const response = await axios.get(url, { params });
        return response.data;
    } catch (error) {
        console.error('News API Error:', error.response?.data || error.message);
        throw {
            status: error.response?.status || 500,
            message: error.response?.data?.message || error.message
        };
    }
};

// Fetch trending news
const getTrendingNews = async (req, res) => {
    try {
        const { page, pageSize } = req.query;

        const data = await makeNewsRequest(`${NEWS_BASE_URL}/top-headlines`, {
            country: 'us',
            category: 'general',
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            apiKey: NEWS_API_KEY
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
            message: error.message
        });
    }
};

// Fetch news by category
const getNewsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        const { page, pageSize } = req.query;

        const data = await makeNewsRequest(`${NEWS_BASE_URL}/top-headlines`, {
            country: 'us',
            category: category,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            apiKey: NEWS_API_KEY
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
            message: error.message
        });
    }
};

// Fetch general news
const getGeneralNews = async (req, res) => {
    try {
        const { page, pageSize } = req.query;

        const data = await makeNewsRequest(`${NEWS_BASE_URL}/top-headlines`, {
            country: 'us',
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            apiKey: NEWS_API_KEY
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
            message: error.message
        });
    }
};

// Fetch politics news using everything endpoint
const getPoliticsNews = async (req, res) => {
    try {
        const { page, pageSize } = req.query;

        const data = await makeNewsRequest(`${NEWS_BASE_URL}/everything`, {
            q: 'politics',
            language: 'en',
            sortBy: 'publishedAt',
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            apiKey: NEWS_API_KEY
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
            message: error.message
        });
    }
};

// Search news
const searchNews = async (req, res) => {
    try {
        const { q: query, page, pageSize } = req.query;

        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Search query is required'
            });
        }

        const data = await makeNewsRequest(`${NEWS_BASE_URL}/everything`, {
            q: query,
            language: 'en',
            sortBy: 'relevancy',
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            apiKey: NEWS_API_KEY
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
            message: error.message
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