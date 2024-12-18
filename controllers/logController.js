const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Directory to store log files
const logDir = path.join(__dirname, '../docker-logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Create a global EventEmitter to manage Docker log streams
const logStreamEmitter = new EventEmitter();

/**
 * Stream logs to the client using Server-Sent Events (SSE).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
function streamServerLogs(req, res) {
    const jobId = req.query.jobId;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }

    console.log(`[Job ${jobId}] Client connected for log streaming.`);

    // Setup SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    res.write(`data: [Connected to log stream for Job ${jobId}]\n\n`);

    const logListener = (logEntry) => {
        res.write(`data: ${logEntry}\n\n`);
    };

    // Listen for log events for this jobId
    logStreamEmitter.on(jobId, logListener);

    // Handle client disconnects
    req.on('close', () => {
        console.log(`[Job ${jobId}] Client disconnected from log stream.`);
        logStreamEmitter.removeListener(jobId, logListener);
        res.end();
    });
}

/**
 * Start streaming logs from the Docker container.
 * @param {String} jobId - The ID of the job.
 * @param {String} processID - The Docker process/container ID.
 */
function tailDockerLogs(jobId, processID) {
    if (!processID) {
        console.error(`[Job ${jobId}] Invalid process ID.`);
        return;
    }

    console.log(`[Job ${jobId}] Starting to tail Docker logs for process ID ${processID}.`);

    const dockerLogs = spawn('docker', ['logs', '-f', processID]);

    dockerLogs.stdout.on('data', (data) => {
        const logEntry = data.toString();
        console.log(`[Job ${jobId}] Docker log (stdout): ${logEntry.trim()}`);
        logStreamEmitter.emit(jobId, logEntry);
    });

    dockerLogs.stderr.on('data', (data) => {
        const logEntry = data.toString();
        console.error(`[Job ${jobId}] Docker log (stderr): ${logEntry.trim()}`);
        logStreamEmitter.emit(jobId, logEntry);
    });

    dockerLogs.on('close', (code) => {
        console.log(`[Job ${jobId}] Docker log streaming process exited with code ${code}.`);
        logStreamEmitter.emit(jobId, '[END OF LOG]');
    });

    dockerLogs.on('error', (err) => {
        console.error(`[Job ${jobId}] Error while spawning Docker logs: ${err.message}`);
        logStreamEmitter.emit(jobId, `[ERROR] ${err.message}`);
    });
}

/**
 * Log job completion.
 * @param {String} jobId - The ID of the completed job.
 * @param {String} processID - The Docker process/container ID.
 */
function logJobCompletion(jobId, processID) {
    if (!processID) {
        console.error('Error: processID is undefined');
        return;
    }

    console.log(`[Job ${jobId}] Job completed successfully.`);
    tailDockerLogs(jobId, processID);
}

/**
 * Log job failure.
 * @param {String} jobId - The ID of the failed job.
 * @param {Error} error - The error that caused the failure.
 */
function logJobFailure(jobId, error) {
    const errorMessage = {
        message: `Job ${jobId} failed`,
        error: error.message,
    };
    console.error(errorMessage);
    logStreamEmitter.emit(jobId, `[ERROR] ${error.message}`);
}

module.exports = {
    streamServerLogs,
    logJobCompletion,
    logJobFailure,
    tailDockerLogs,
    logStreamEmitter,
};

console.log('logController.js loaded successfully');
