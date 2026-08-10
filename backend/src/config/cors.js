'use strict';

/**
 * @file cors.js
 * @description CORS configuration for Crash Guard backend.
 *
 * Whitelisted origins:
 *   - http://localhost:5173  (Vite default)
 *   - http://localhost:5174  (Vite alternate — used when 5173 is taken)
 *   - FRONTEND_ORIGIN env variable (production domain)
 *
 * Simple requests (GET, POST with safe content-types) are allowed.
 * Credentials are enabled so cookies/auth headers pass through if needed later.
 */

const cors = require('cors');

const WHITELISTED = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean)); // Remove undefined if FRONTEND_ORIGIN is not set

const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    if (WHITELISTED.has(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
    return callback(new Error(`CORS policy: origin "${origin}" is not allowed.`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // preflight cache: 24 hours
};

module.exports = cors(corsOptions);
