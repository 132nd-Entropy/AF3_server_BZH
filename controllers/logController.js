// controllers/logController.js

const dockerService = require('../services/dockerService');
/**
 * Stream server logs to the client using Server-Sent Events (SSE).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */

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
/**
 * Log job completion.
 * @param {String} jobId - The ID of the completed job.
 */
function logJobCompletion(jobId) {
    const completionMessage = `Job ${jobId} completed successfully.`;
    console.log(completionMessage);
    // Additional logging mechanisms can be added here
    // For example, writing to a log file or sending notifications
}

/**
 * Log job failure.
 * @param {String} jobId - The ID of the failed job.
 * @param {Error} error - The error that caused the failure.
 */
function logJobFailure(jobId, error) {
    const failureMessage = `Job ${jobId} failed: ${error.message}`;
    console.error(failureMessage);
    // Additional logging mechanisms can be added here
    // For example, writing to a log file or sending notifications
}

module.exports = {
    streamServerLogs,
    logJobCompletion,
    logJobFailure,
};
