'use strict';

const express = require('express');
const router = express.Router();
const relativeController = require('../controllers/relativeController');
const { validate, schemas } = require('../middleware/validate');

router.post('/pair', validate(schemas.pairRelative), relativeController.pairRelative);

module.exports = router;
