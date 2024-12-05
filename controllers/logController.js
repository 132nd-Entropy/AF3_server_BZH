// controllers/logController.js

const dockerService = require('../services/dockerService');

function streamServerLogs(req, res) {
    const jobId = req.query.jobId;
    if (!jobId) {
        res.status(400).send('Job ID is required');
        return;
    }

    const jobLogEmitter = dockerService.getJobLogEmitter(jobId);
    if (!jobLogEmitter) {
        res.status(404).send('Job not found or has no logs');
        return;
    }

    // Set headers for Server-Sent Events (SSE)
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders(); // Flush headers to establish SSE

    const sendLog = (log) => {
        res.write(`data: ${log}\n\n`);
    };

    // Listen for 'log' events and send them to the client
    jobLogEmitter.on('log', sendLog);

    // Handle client disconnects
    req.on('close', () => {
        jobLogEmitter.removeListener('log', sendLog);
        res.end();
    });
}

module.exports = {
    streamServerLogs,
    logJobCompletion,
    logJobFailure,
};
