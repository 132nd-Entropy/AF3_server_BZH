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
        console.error(`[Job ${jobId}] Job not found or has no logs`);
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

    const handleCleanup = () => {
        console.log(`[Job ${jobId}] Cleaning up SSE connection`);
        jobLogEmitter.removeListener('log', sendLog);
        dockerService.cleanupEmitter(jobId); // Ensure cleanup is called
        res.end();
    };

    jobLogEmitter.on('log', sendLog);

    req.on('close', handleCleanup);
    req.on('error', (err) => {
        console.error(`[Job ${jobId}] Error in SSE connection: ${err.message}`);
        handleCleanup();
    });

    // Auto-cleanup in case the emitter becomes inactive
    const cleanupTimeout = parseInt(process.env.SSE_CLEANUP_TIMEOUT || '60000', 10); // Default 60 seconds
    setTimeout(() => {
        if (jobLogEmitter.listenerCount('log') === 0) {
            console.log(`[Job ${jobId}] No active listeners; auto-cleaning up`);
            handleCleanup();
        }
    }, cleanupTimeout);
}

/**
 * Log job completion.
 * @param {String} jobId - The ID of the completed job.
 */
function logJobCompletion(jobId) {
    const completionMessage = `Job ${jobId} completed successfully.`;
    console.log(completionMessage);

    // Placeholder for additional logging mechanisms
    // Example: Append to a log file
    // fs.appendFileSync('job_logs.txt', `${completionMessage}\n`);
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

    // Placeholder for additional logging mechanisms
    // Example: Append to a log file
    // fs.appendFileSync('job_errors.txt', `Job ${jobId} failed: ${error.message}\n`);
}

module.exports = {
    streamServerLogs,
    logJobCompletion,
    logJobFailure,
};

console.log('logController.js loaded successfully');
