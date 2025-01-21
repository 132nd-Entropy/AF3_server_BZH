const fs = require('fs');
const path = require('path');
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
 * Only Docker log file content will be streamed.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
function streamServerLogs(req, res) {
    const jobId = req.query.jobId;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }

    console.log(`[Job ${jobId}] Client connected for Docker log file streaming.`);

    // Setup SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    res.write(`data: [Connected to Docker log file stream for Job ${jobId}]\n\n`);

    const logListener = (logEntry) => {
        console.log(`[Job ${jobId}] Sending log to client: ${logEntry}`); // Debug sending log
        res.write(`data: ${logEntry}\n\n`);
    };

    // Listen for log events for this jobId
    logStreamEmitter.on(jobId, logListener);

    // Handle client disconnects
    req.on('close', () => {
        console.log(`[Job ${jobId}] Client disconnected from Docker log file stream.`);
        logStreamEmitter.removeListener(jobId, logListener);
        res.end();
    });
}

function waitForLogFile(jobId, logFilePath, retryInterval = 1000, maxRetries = 10) {
    let attempts = 0;

    const intervalId = setInterval(() => {
        if (fs.existsSync(logFilePath)) {
            console.log(`[Job ${jobId}] Log file found at ${logFilePath}`);
            clearInterval(intervalId);
            tailDockerLogs(jobId); // Start reading the log file once it exists
        } else {
            attempts++;
            console.log(`[Job ${jobId}] Log file not found. Retrying... (${attempts}/${maxRetries})`);
            if (attempts >= maxRetries) {
                console.error(`[Job ${jobId}] Log file not found after ${maxRetries} retries.`);
                clearInterval(intervalId);
                logStreamEmitter.emit(jobId, `[ERROR] Log file not found after multiple attempts.`);
            }
        }
    }, retryInterval);
}


/**
 * Start streaming logs from the Docker log file.
 * @param {String} jobId - The ID of the job.
 */
function tailDockerLogs(jobId) {
    console.log(`[Job ${jobId}] tailDockerLogs invoked.`);
    const logFilePath = path.join(logDir, `${jobId}.log`);
    console.log(`[Job ${jobId}] Attempting to read log file: ${logFilePath}`);

    if (!fs.existsSync(logFilePath)) {
        console.error(`[Job ${jobId}] Log file not found: ${logFilePath}`);
        logStreamEmitter.emit(jobId, `[ERROR] Log file not found.`);
        return;
    }

    const readStream = fs.createReadStream(logFilePath, { encoding: 'utf-8' });

    readStream.on('data', (chunk) => {
        const logEntry = chunk.toString();
        console.log(`[Job ${jobId}] Emitting log chunk: ${logEntry}`); // Debug emitted log
        logStreamEmitter.emit(jobId, logEntry);
    });

    readStream.on('end', () => {
        console.log(`[Job ${jobId}] End of log file stream.`);
        logStreamEmitter.emit(jobId, '[END OF LOG]');
    });

    readStream.on('error', (err) => {
        console.error(`[Job ${jobId}] Error reading Docker log file: ${err.message}`);
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
        console.error(`[Job ${jobId}] Error: processID is undefined`);
        return;
    }

    console.log(`[Job ${jobId}] logJobCompletion triggered with processID: ${processID}`);
    waitForLogFile(jobId, logFilePath);

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
