const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const TailFile = require('tail-file');


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
 * Tail logs from an existing Docker log file on disk.
 * @param {String} jobId - The ID of the job.
 * @param {String} logFilename - The name of the Docker log file for that job.
 */
function tailDockerLogs(jobId, logFilename) {
    if (!logFilename) {
        console.error(`[Job ${jobId}] Invalid log filename.`);
        return;
    }

    const logFilePath = path.join(logDir, logFilename);
    if (!fs.existsSync(logFilePath)) {
        fs.writeFileSync(logFilePath, '');
    }
    console.log(`[Job ${jobId}] Starting to tail Docker log file: ${logFilePath}`);

    // lineHandler: called for each new line
    function lineHandler(line) {
        console.log(`[Job ${jobId}] Docker log line: ${line.trim()}`);
        // Emit line to SSE clients
        logStreamEmitter.emit(jobId, line);
    }

    // errorHandler: handle tail-file errors
    function errorHandler(err) {
        console.error(`[Job ${jobId}] Error tailing file: ${err.message}`);
        logStreamEmitter.emit(jobId, `[ERROR] ${err.message}`);
    }

    // Create a TailFile instance with the old v1.x signature
    //     TailFile(filepath, lineHandler, errorHandler, [options])
    const tail = new TailFile(logFilePath, lineHandler, errorHandler, {
        startPos: 0  // read from the beginning of the file
        // Other options: breakOnError, verbose, useWatchFile, waitPause, readInterval...
    });

    // No .catch(...) because this start() does NOT return a Promise in v1.x
    tail.start();
}

/**
 * Log job completion / start streaming its logs.
 * @param {String} jobId - The ID of the completed job.
 * @param {String} logFilename - The Docker log file name (e.g., jobId + '.log').
 */

function logJobCompletion(jobId) {
    const logFilename = `${jobId}.log`;
 }

function onJobStart(jobId) {
    const logFilename = `${jobId}.log`;
    tailDockerLogs(jobId, logFilename);
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
    onJobStart,
};

console.log('logController.js loaded successfully');
