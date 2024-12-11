const dockerService = require('../services/dockerService');

/**
 * Stream server logs to the client using Server-Sent Events (SSE).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
function streamServerLogs(req, res) {
    const jobId = req.query.jobId;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }

    const jobLogEmitter = dockerService.getJobLogEmitter(jobId);
    if (!jobLogEmitter) {
        return res.status(404).json({ error: 'Job not found or has no logs' });
    }

    console.log(`[Job ${jobId}] Streaming logs...`);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    res.flushHeaders();

    const sendLog = (log) => {
        console.log(`[Job ${jobId}] Log sent: ${log}`);
        res.write(`data: ${log}\n\n`);
    };

    jobLogEmitter.on('log', sendLog);

    req.on('close', () => {
        console.log(`[Job ${jobId}] Connection closed`);
        jobLogEmitter.removeListener('log', sendLog);
        res.end();
    });

    req.on('error', (err) => {
        console.error(`[Job ${jobId}] Error in SSE connection: ${err.message}`);
        res.end();
    });

    // Auto-cleanup in case the emitter becomes inactive
    setTimeout(() => {
        if (jobLogEmitter.listenerCount('log') === 0) {
            console.log(`[Job ${jobId}] No active listeners; cleaning up`);
            dockerService.cleanupEmitter(jobId);
        }
    }, 60000); // Clean up after 60 seconds
}

/**
 * Fetch logs for the current job when the frontend initializes.
 * @param {String} currentJobId - The ID of the currently processing job.
 */
function fetchCurrentLogs(currentJobId) {
    const jobLogEmitter = dockerService.getJobLogEmitter(currentJobId);

    if (jobLogEmitter) {
        console.log(`[Job ${currentJobId}] Fetching existing logs on reconnect`);
        jobLogEmitter.emit('log', 'Reconnecting to logs...');
    } else {
        console.log(`[Job ${currentJobId}] No existing logs found for reconnection.`);
    }
}

/**
 * Log job completion.
 * @param {String} jobId - The ID of the completed job.
 */
function logJobCompletion(jobId) {
    const completionMessage = `Job ${jobId} completed successfully.`;
    console.log(completionMessage);
}

/**
 * Log job failure.
 * @param {String} jobId - The ID of the failed job.
 * @param {Error} error - The error that caused the failure.
 */
function logJobFailure(jobId, error) {
    console.error({
        message: `Job ${jobId} failed`,
        error: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    });
}

module.exports = {
    streamServerLogs,
    fetchCurrentLogs, // Exported for frontend initialization
    logJobCompletion,
    logJobFailure,
};

console.log('logController.js loaded successfully');
