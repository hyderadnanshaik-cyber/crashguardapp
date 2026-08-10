'use strict';

const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { validate, schemas } = require('../middleware/validate');

router.post('/trigger', validate(schemas.triggerEmergency), incidentController.triggerEmergency);
router.get('/live/:riderId', incidentController.getLiveData);
router.post('/cancel', validate(schemas.cancelIncident), incidentController.cancelIncident);
router.post('/sync-queue', validate(schemas.syncQueue), incidentController.syncOfflineQueue);

module.exports = router;
