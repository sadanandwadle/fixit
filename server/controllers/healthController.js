const mongoose = require('mongoose');

// @desc    Get API health status
// @route   GET /api/health
// @access  Public
const getHealthStatus = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    success: true,
    status: 'ok',
    message: 'FIXIT Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: states[dbState] || 'unknown',
      connected: dbState === 1,
    },
    version: '1.0.0',
  });
};

module.exports = { getHealthStatus };
