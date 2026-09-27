const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` FIXIT Server is running on port ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` API Docs / Info: http://localhost:${PORT}/`);
    console.log(`===============================================`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection] ${err.name}: ${err.message}`);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error(`[Uncaught Exception] ${err.name}: ${err.message}`);
  });

  // Handle graceful shutdown signals
  const gracefulShutdown = (signal) => {
    console.log(`\n[Server] ${signal} signal received: closing HTTP server gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP server closed cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();
