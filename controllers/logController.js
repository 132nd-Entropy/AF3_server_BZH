const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const TailFile = require('tail-file');

// Directory to store log files
const logDir = path.join(__dirname, '../docker-logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Global emitter for SSE
const logStreamEmitter = new EventEmitter();

// ---- NEW STATE FOR QUEUED LOG STREAMING ----
let activeJobId = null;            // currently streamed job
const pendingJobIds = [];          // queue of upcoming jobs
const tailInstances = new Map();   // jobId → TailFile instance

/**
 * Stream logs to the client using Server-Sent Events (SSE).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
function streamServerLogs(req, res) {
  console.log(`[SSE] New client connected to /logs`);

  // Required SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Avoid socket timeouts on some stacks
  if (req.socket && req.socket.setTimeout) req.socket.setTimeout(0);

  // Send an initial event so the browser shows something immediately
  res.write(`data: [Connected to unified log stream at ${new Date().toISOString()}]\n\n`);

  // Keepalive every 25s (SSE comment line)
  const keepAlive = setInterval(() => res.write(`: keepalive\n\n`), 25000);

  // Forward every tailed line to the client
  const listener = (payload) => {
    if (!payload || !payload.line) return;
    // IMPORTANT: one 'data:' and a blank line terminator
    res.write(`data: [${payload.jobId}] ${payload.line}\n\n`);
  };

  logStreamEmitter.on('unified', listener);

  req.on('close', () => {
    console.log(`[SSE] Client disconnected from /logs`);
    clearInterval(keepAlive);
    logStreamEmitter.removeListener('unified', listener);
    res.end();
  });
}




/**
 * Tail logs for a specific job, but only stream actively if it's the active job.
 * If another job is currently active, queue this one for later.
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

    console.log(`[Job ${jobId}] Preparing to tail Docker log file: ${logFilePath}`);

    const tail = new TailFile(
        logFilePath,
        (line) => {
        // Always broadcast line to unified stream
        logStreamEmitter.emit('unified', { jobId, line });
        },
        (err) => {
            console.error(`[Job ${jobId}] Error tailing file: ${err.message}`);
            logStreamEmitter.emit(jobId, `[ERROR] ${err.message}`);
        },
        { startPos: 0 }
    );

    tailInstances.set(jobId, tail);
    tail.start();

    // If no job is active, make this job the active stream
    if (!activeJobId) {
        activateJobStream(jobId);
    } else if (activeJobId !== jobId) {
        pendingJobIds.push(jobId);
        console.log(`[Job ${jobId}] Queued log stream behind ${activeJobId}`);
    }
}

/**
 * Promote a job to active log stream.
 */
function activateJobStream(jobId) {
    activeJobId = jobId;
    console.log(`[Job ${jobId}] is now ACTIVE log stream`);
    logStreamEmitter.emit(jobId, `[INFO] Now streaming logs for job ${jobId}`);
}

/**
 * Mark a job as completed and, if it was active, switch to next queued job.
 */
function logJobCompletion(jobId) {
    console.log(`[Job ${jobId}] Completed.`);

    const tail = tailInstances.get(jobId);
    if (tail) {
        try {
            tail.quit();
            tailInstances.delete(jobId);
        } catch (e) {
            console.warn(`[Job ${jobId}] Could not stop tail cleanly: ${e.message}`);
        }
    }

    if (activeJobId === jobId) {
        // Activate next queued job
        const nextJob = pendingJobIds.shift();
        if (nextJob) {
            console.log(`[LogQueue] Switching to next job ${nextJob}`);
            activateJobStream(nextJob);
        } else {
            console.log(`[LogQueue] No pending jobs; clearing active log stream.`);
            activeJobId = null;
        }
    } else {
        // Remove from queue if it was queued
        const idx = pendingJobIds.indexOf(jobId);
        if (idx !== -1) pendingJobIds.splice(idx, 1);
    }
}

/**
 * Called when a job starts — sets up tail and queue logic.
 */
function onJobStart(jobId) {
    const logFilename = `${jobId}.log`;
    tailDockerLogs(jobId, logFilename);
}

/**
 * Log job failure.
 */
function logJobFailure(jobId, error) {
    const errorMessage = `[ERROR] Job ${jobId} failed: ${error.message}`;
    console.error(errorMessage);
    logStreamEmitter.emit(jobId, errorMessage);
    logJobCompletion(jobId); // also mark completed to advance queue
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
