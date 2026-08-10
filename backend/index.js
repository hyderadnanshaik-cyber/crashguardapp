'use strict';

/**
 * @file index.js
 * @description Entry point for Crash Guard Express server.
 */

require('dotenv').config();
const createApp = require('./src/app');

const PORT = process.env.PORT || 4000;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`
===================================================
 🚨 CRASH GUARD BY REDHACK — BACKEND INFRASTRUCTURE
===================================================
  ➜ Server running on : http://localhost:${PORT}
  ➜ Environment      : ${process.env.NODE_ENV || 'development'}
  ➜ Health Check     : http://localhost:${PORT}/health
===================================================
  `);
});

// Graceful Shutdown
function gracefulShutdown(signal) {
  console.log(`\n[Server] ${signal} received. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed. Exiting process.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
