const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { loadEnv } = require('./config/env');

// Load environment variables
loadEnv();

const { connectDB } = require('./config/database');
const apiRoutes = require('./routes/api');
const errorHandler = require('./utils/errorHandler');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Error handling
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = app;



