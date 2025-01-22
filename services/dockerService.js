const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
const jobLogEmitters = {}; // Object to store per-job EventEmitters
const jobLogs = {}; // Persistent storage for logs
const docker = require('dockerode');
const dockerClient = new docker();
const path = require('path');
const logController = require('../controllers/logController');

/**
 * Captures and streams Docker container logs to a log file.
 * @param {string} jobId - Unique job identifier.
 * @param {string} containerId - Docker container ID.
 */
function captureContainerLogs(jobId, containerId) {
    const logDir = path.join(__dirname, '../docker-logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `${jobId}.log`);
    console.log(`[Job ${jobId}] Capturing logs for container: ${containerId}`);

    const logStream = spawn('docker', ['logs', '-f', containerId]);

    logStream.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(`[Job ${jobId}] STDOUT: ${log}`);
        try {
            fs.appendFileSync(logFile, log);
        } catch (err) {
            console.error(`[Job ${jobId}] Error writing to log file: ${err.message}`);
        }
    });

    logStream.stderr.on('data', (data) => {
        const log = data.toString();
        console.error(`[Job ${jobId}] STDERR: ${log}`);
        try {
            fs.appendFileSync(logFile, log);
        } catch (err) {
            console.error(`[Job ${jobId}] Error writing to log file: ${err.message}`);
        }
    });

    logStream.on('close', (code) => {
        console.log(`[Job ${jobId}] Log streaming exited with code: ${code}`);
    });

    logStream.on('error', (err) => {
        console.error(`[Job ${jobId}] Error streaming logs: ${err.message}`);
    });
}


/**
 * Monitors the Docker container for completion.
 * @param {string} jobId - Unique job identifier.
 * @param {string} containerId - Docker container ID.
 * @param {function} callback - Callback to handle job completion or errors.
 */
function monitorContainerCompletion(jobId, containerId, callback) {
    console.log(`[Job ${jobId}] Monitoring container: ${containerId} for completion.`);
    const interval = setInterval(() => {
        dockerClient.getContainer(containerId).inspect((err, data) => {
            if (err) {
                console.error(`[Job ${jobId}] Error inspecting container: ${err.message}`);
                clearInterval(interval);
                callback(new Error(`[Job ${jobId}] Failed to monitor container: ${err.message}`));
                return;
            }

            const isRunning = data.State.Running;
            if (!isRunning) {
                console.log(`[Job ${jobId}] Container has stopped.`);
                clearInterval(interval);
                callback(null); // Job is completed successfully
            }
        });
    }, 2000); // Check every 2 seconds
}

/**
 * Starts a Docker container.
 * @param {string} jobId - Unique job identifier.
 * @param {Object} jobConfig - Docker configuration object.
 * @param {function} callback - Callback to handle job start errors or process ID.
 */
function startContainer(jobId, jobConfig, callback) {
    dockerClient.createContainer(jobConfig, (err, container) => {
        if (err) {
            console.error(`[Job ${jobId}] Error creating container: ${err.message}`);
            return callback(err);
        }

        const processID = container.id;
        console.log(`[Job ${jobId}] Docker container created with ID: ${processID}`);

        container.start((startErr) => {
            if (startErr) {
                console.error(`[Job ${jobId}] Error starting container: ${startErr.message}`);
                return callback(startErr);
            }

            console.log(`[Job ${jobId}] Docker container started successfully.`);
            callback(null, processID); // Pass processID to the callback
        });
    });
}

/**
 * Runs a Docker job.
 * @param {string} jobId - Unique job identifier.
 * @param {string} filePath - Path to the JSON file for the job.
 * @param {function} callback - Callback to handle job completion or errors.
 * @param {function} onContainerStart - Callback for when the container starts, with the container ID.
 */
function runDockerJob(jobId, filePath, callback, onContainerStart) {
    const fullPath = filePath.endsWith('.json')
        ? filePath
        : `/home/entropy/AF3_server_BZH/job_data/${filePath}.json`;

    console.log(`[Job ${jobId}] Full file path: ${fullPath}`);

    if (!fs.existsSync(fullPath)) {
        console.error(`[Job ${jobId}] File not found: ${fullPath}`);
        callback(new Error(`[Job ${jobId}] File not found: ${fullPath}`));
        return;
    }

    const dockerCommand = [
        'run',
        '-d', // Detached mode to return the container ID
        '-i',
        '-v', '/home/entropy/output_alphafold3:/home/entropy/output_alphafold3',
        '-v', '/opt/alphafold3_database:/opt/alphafold3_database',
        '-v', '/opt/alphafold3_model:/opt/alphafold3_model',
        '-v', '/home/entropy/AF3_server_BZH/job_data:/home/entropy/AF3_server_BZH/job_data',
        '--gpus', 'all',
        'alphafold3',
        'python3', 'run_alphafold.py',
        `--json_path=${fullPath}`,
        '--model_dir=/opt/alphafold3_model',
        '--db_dir=/opt/alphafold3_database',
        '--output_dir=/home/entropy/output_alphafold3',
    ];

    const dockerProcess = spawn('docker', dockerCommand);
    let containerId = '';

    dockerProcess.stdout.on('data', (data) => {
        const log = data.toString().trim();
        console.log(`[Job ${jobId}] STDOUT: ${log}`);

        if (!containerId) {
            containerId = log; // Capture container ID
            console.log(`[Job ${jobId}] Docker container started with ID: ${containerId}`);
            const logFilename = `${jobId}.log`;
            logController.tailDockerLogs(jobId, logFilename);
            captureContainerLogs(jobId, containerId); // Start capturing logs
            if (typeof onContainerStart === 'function') {
                onContainerStart(containerId);
            }
        }
    });

    dockerProcess.stderr.on('data', (data) => {
        console.error(`[Job ${jobId}] STDERR: ${data.toString()}`);
    });

    dockerProcess.on('close', (code) => {
        if (code !== 0) {
            callback(new Error(`[Job ${jobId}] Docker exited with code ${code}`));
            return;
        }
        monitorContainerCompletion(jobId, containerId, callback); // Monitor container completion
    });

    dockerProcess.on('error', (error) => {
        console.error(`[Job ${jobId}] Error starting Docker process: ${error.message}`);
        callback(new Error(`[Job ${jobId}] ${error.message}`));
    });
}


/**
 * Gets the EventEmitter for a job's logs.
 * @param {string} jobId - The job ID.
 * @returns {EventEmitter|null} - The EventEmitter for the job logs or null if not found.
 */
function getJobLogEmitter(jobId) {
    if (!jobLogEmitters[jobId]) {
        jobLogEmitters[jobId] = new EventEmitter();
    }
    return jobLogEmitters[jobId];
}

/**
 * Cleans up the emitter for a job.
 * @param {string} jobId - The job ID.
 */
function cleanupEmitter(jobId) {
    if (jobLogEmitters[jobId]) {
        console.log(`[Job ${jobId}] Cleaning up job emitter`);
        delete jobLogEmitters[jobId];
    }
}

module.exports = {
    runDockerJob,
    getJobLogEmitter,
    cleanupEmitter,
};
