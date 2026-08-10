'use strict';

/**
 * @file validate.js
 * @description Joi-based request validation middleware factory.
 *
 * Usage:
 *   router.post('/pair', validate(schemas.pairRelative), relativeController.pairRelative);
 *
 * On validation failure → 400 with structured error list.
 */

const Joi = require('joi');

// ── Shared field definitions ───────────────────────────────────────────────
const latitudeSchema  = Joi.number().min(-90).max(90).required();
const longitudeSchema = Joi.number().min(-180).max(180).required();

const locationSchema = Joi.object({
  latitude:  latitudeSchema,
  longitude: longitudeSchema,
  address:   Joi.string().optional().allow(''),
});

// ── Request schemas ────────────────────────────────────────────────────────
const schemas = {
  /** POST /api/relatives/pair */
  pairRelative: Joi.object({
    riderAccessCode:    Joi.string().length(6).pattern(/^\d{6}$/).required()
                          .messages({ 'string.pattern.base': 'riderAccessCode must be a 6-digit number' }),
    relativeFcmToken:   Joi.string().min(10).required(),
    relativeDeviceName: Joi.string().max(100).optional().allow(''),
  }),

  /** POST /api/incidents/trigger */
  triggerEmergency: Joi.object({
    riderId:    Joi.string().min(1).required(),
    incidentId: Joi.string().min(1).required(),
    peakForce:  Joi.number().min(0).required(),
    severity:   Joi.string().valid('MINOR', 'MODERATE', 'SEVERE').required(),
    location:   locationSchema.required(),
  }),

  /** POST /api/incidents/cancel */
  cancelIncident: Joi.object({
    riderId:    Joi.string().min(1).required(),
    incidentId: Joi.string().min(1).required(),
    reason:     Joi.string().max(500).optional().allow(''),
  }),

  /** POST /api/incidents/sync-queue */
  syncQueue: Joi.object({
    riderId: Joi.string().min(1).required(),
    items: Joi.array().items(
      Joi.object({
        incidentId: Joi.string().required(),
        peakForce:  Joi.number().min(0).required(),
        severity:   Joi.string().valid('MINOR', 'MODERATE', 'SEVERE').required(),
        location:   locationSchema.required(),
        timestamp:  Joi.number().required(), // Unix ms
        status:     Joi.string().optional(),
      })
    ).min(1).max(100).required(),
  }),
};

/**
 * Middleware factory. Returns an Express middleware that validates
 * `req.body` against the given Joi schema.
 *
 * @param {Joi.ObjectSchema} schema
 * @returns {import('express').RequestHandler}
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,      // collect all errors
      stripUnknown: true,     // drop unknown fields silently
    });

    if (error) {
      const details = error.details.map((d) => ({
        field:   d.context?.key || 'unknown',
        message: d.message,
      }));
      return res.status(400).json({
        error:   'VALIDATION_ERROR',
        message: 'Request body validation failed',
        details,
      });
    }

    req.body = value; // replace with sanitized + coerced value
    return next();
  };
}

module.exports = { validate, schemas };
