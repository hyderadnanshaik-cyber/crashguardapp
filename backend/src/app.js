'use strict';

/**
 * @file app.js
 * @description Express Application Factory.
 */

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const corsMiddleware = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');

const relativeRoutes = require('./routes/relatives');
const incidentRoutes = require('./routes/incidents');

function createApp() {
  const app = express();

  // Security Headers
  app.use(helmet());

  // Request Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // CORS
  app.use(corsMiddleware);

  // Body Parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check route
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      system: 'Crash Guard Backend Service',
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/relatives', relativeRoutes);
  app.use('/api/incidents', incidentRoutes);

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
