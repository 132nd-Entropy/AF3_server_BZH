const fs = require('fs');
const path = require('path');
const dockerService = require('../services/dockerService');
const { spawn } = require('child_process');
const { exec } = require('child_process');



// Directory to store log files
const logDir = path.join(__dirname, '../docker-logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Stream logs from the generated log file to the client using Server-Sent Events (SSE).
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */

function streamServerLogs(req, res) {
    const jobId = req.query.jobId;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }

    const logFile = path.join(logDir, `${jobId}.log`);

    console.log(`[Job ${jobId}] Received request to stream logs.`);

    // Setup SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    res.flushHeaders();

    // Retry mechanism for missing log file
    let retryInterval;

    let isStreaming = false; // Add a flag

const startStreaming = () => {
    if (isStreaming) return; // Prevent multiple starts
    isStreaming = true;
    console.log(`[Job ${jobId}] Starting to stream logs from ${logFile}.`);
    let lastSize = 0;

    retryInterval = setInterval(() => {
        fs.stat(logFile, (err, stats) => {
            if (err && err.code === 'ENOENT') {
                console.log(`[Job ${jobId}] Log file not found. Retrying...`);
                return; // Log file doesn't exist yet
            }

            if (stats.size > lastSize) {
                const stream = fs.createReadStream(logFile, {
                    start: lastSize,
                    encoding: 'utf8',
                });

                stream.on('data', (chunk) => {
                    res.write(`data: ${chunk}\n\n`);
                });

                lastSize = stats.size;
            }
        });
    }, 1000);
};


    // Check if the log file already exists
    if (fs.existsSync(logFile)) {
        startStreaming();
    } else {
        console.log(`[Job ${jobId}] Log file not found. Waiting for creation...`);

        // Watch for log file creation
        retryInterval = setInterval(() => {
            if (fs.existsSync(logFile)) {
                clearInterval(retryInterval);
                startStreaming();
            }
        }, 1000);
    }

  req.on('close', () => {
    console.log(`[Job ${jobId}] Client disconnected from log stream.`);
    clearInterval(retryInterval);
    isStreaming = false; // Reset streaming flag
    res.end();
});

}






/**
 * Log job completion.
 * @param {String} jobId - The ID of the completed job.
 */
function logJobCompletion(jobId,processID) {
    if (!processID) {
        console.error('Error: processID is undefined');
        return;
    }

    const completionMessage = `Job ${jobId} completed successfully.`;
    console.log(completionMessage);
    console.log(`[DEBUG] Invoking tailDockerLogs for Job ${jobId} completion.`);
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
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
    };
    console.error(errorMessage);
    tailDockerLogs(jobId, JSON.stringify(errorMessage, null, 2)); // Save error message to log file
}

/**
 * Append logs to a file in the docker-logs directory.
 * @param {String} jobId - The ID of the job.
 * @param {String} log - The log content to save.
 */
function tailDockerLogs(jobId, processID) {
    const logFile = path.join(logDir, `${jobId}.log`); // Ensure logFile is properly declared here

    console.log(`[Job ${jobId}] Starting to tail Docker logs for process ID ${processID}.`);

    // Validate container existence
    exec(`docker inspect ${processID}`, (err) => {
        if (err) {
            console.error(`[Job ${jobId}] Container with ID ${processID} does not exist.`);
            fs.appendFile(logFile, `Error: Container with ID ${processID} does not exist.\n`, (err) => {
                if (err) console.error(`[Job ${jobId}] Failed to write error to log file: ${err.message}`);
            });
            return;
        }

        console.log(`[Job ${jobId}] Container with ID ${processID} exists. Starting log streaming.`);

        // Spawn the docker logs command
        const dockerLogs = spawn('docker', ['logs', '-f', processID]);

        // Handle standard output logs
        dockerLogs.stdout.on('data', (data) => {
            const logEntry = data.toString();
            fs.appendFile(logFile, logEntry, (err) => {
                if (err) {
                    console.error(`[Job ${jobId}] Failed to write log to file: ${err.message}`);
                }
            });
        });

        // Handle error logs
        dockerLogs.stderr.on('data', (data) => {
            const logEntry = data.toString();
            fs.appendFile(logFile, logEntry, (err) => {
                if (err) {
                    console.error(`[Job ${jobId}] Failed to write error log to file: ${err.message}`);
                }
            });
        });

        // Handle process close event
        dockerLogs.on('close', (code) => {
            if (code === 0) {
                console.log(`[Job ${jobId}] Docker log streaming completed.`);
            } else {
                console.error(`[Job ${jobId}] Docker log streaming process exited with code ${code}.`);
            }
        });

        // Handle process errors
        dockerLogs.on('error', (err) => {
            console.error(`[Job ${jobId}] Error while spawning Docker logs: ${err.message}`);
            fs.appendFile(logFile, `Error: ${err.message}\n`, (err) => {
                if (err) console.error(`[Job ${jobId}] Failed to write error to log file: ${err.message}`);
            });
        });
    });
}



module.exports = {
    streamServerLogs,
    logJobCompletion,
    logJobFailure,
    tailDockerLogs,
};

console.log('logController.js loaded successfully');
