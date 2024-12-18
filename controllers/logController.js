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

    console.log(`[Job ${jobId}] Streaming logs to frontend...`);

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    let lastSize = 0;
    const interval = setInterval(() => {
        fs.stat(logFile, (err, stats) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.log(`[Job ${jobId}] Log file not found. Retrying...`);
                } else {
                    console.error(`[Job ${jobId}] Error reading log file: ${err.message}`);
                }
                return;
            }

            if (stats.size > lastSize) {
                const stream = fs.createReadStream(logFile, {
                    start: lastSize,
                    end: stats.size,
                    encoding: 'utf8',
                });

                stream.on('data', (chunk) => {
                    res.write(`data: ${chunk}\n\n`);
                });

                lastSize = stats.size;
            }
        });
    }, 1000);

    req.on('close', () => {
        console.log(`[Job ${jobId}] Client disconnected. Stopping log stream.`);
        clearInterval(interval);
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
    exec(`docker inspect ${processID}`, (err) => {
    if (err) {
        console.error(`[Job ${jobId}] Container with ID ${processID} does not exist.`);
        return;
    }

    console.log(`[Job ${jobId}] Container with ID ${processID} exists. Starting logs.`);

    });
    const logFile = path.join(logDir, `${jobId}.log`);

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

        dockerLogs.stdout.on('data', (data) => {
            const logEntry = data.toString();
            fs.appendFile(logFile, logEntry, (err) => {
                if (err) {
                    console.error(`[Job ${jobId}] Failed to write log to file: ${err.message}`);
                }
            });
        });

        dockerLogs.stderr.on('data', (data) => {
            const logEntry = data.toString();
            fs.appendFile(logFile, logEntry, (err) => {
                if (err) {
                    console.error(`[Job ${jobId}] Failed to write error log to file: ${err.message}`);
                }
            });
        });

        dockerLogs.on('close', (code) => {
            if (code === 0) {
                console.log(`[Job ${jobId}] Docker log streaming completed.`);
            } else {
                console.error(`[Job ${jobId}] Docker log streaming process exited with code ${code}.`);
            }
        });

        dockerLogs.on('error', (err) => {
            console.error(`[Job ${jobId}] Error while spawning Docker logs: ${err.message}`);
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
