// routes/index.js
const express = require('express');
const router = express.Router();

const jobController = require('../controllers/jobController');
const queueController = require('../controllers/queueController');
const logController = require('../controllers/logController');

// --- API routes (ORDER MATTERS: put specific routes before any catch-alls) ---

// Unified SSE stream for live logs
router.get('/logs', logController.streamServerLogs);

// Historical logs for a specific job (used on browser reload)
router.get('/logs/history/:jobId', logController.getHistoricalLogs);

// Queue / jobs endpoints
router.get('/queue-status', queueController.getQueueStatus);
router.post('/create-json', jobController.createJob);

// (Optional legacy alias; harmless if unused)
router.get('/server-logs', logController.streamServerLogs);

// Export router
module.exports = router;
