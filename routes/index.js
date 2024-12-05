// routes/index.js
const express = require('express');
const router = express.Router();

// Controllers
const jobController = require('../controllers/jobController');
const logController = require('../controllers/logController');
const queueController = require('../controllers/queueController');

// API Endpoints
router.post('/create-json', jobController.createJson);
router.get('/queue-status', queueController.getQueueStatus);

// New SSE Endpoint for Log Streaming
router.get('/server-logs', logController.streamServerLogs);

module.exports = router;
