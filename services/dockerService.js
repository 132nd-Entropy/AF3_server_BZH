const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');
const jobLogEmitters = {}; // Object to store per-job EventEmitters

/**
 * Run a Docker job.
 * @param {string} jobId - Unique job identifier.
 * @param {string} filePath - Path to the JSON file for the job.
 * @param {function} callback - Callback to handle job completion or errors.
 */
function runDockerJob(jobId, filePath, callback) {
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

    console.log(`[Job ${jobId}] Starting Docker container with command: docker ${dockerCommand.join(' ')}`);

    const dockerProcess = spawn('docker', dockerCommand);
    const jobLogEmitter = new EventEmitter();
    jobLogEmitters[jobId] = jobLogEmitter;

    dockerProcess.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(`[Job ${jobId}] STDOUT: ${log}`);
        jobLogEmitter.emit('log', log);
    });

    dockerProcess.stderr.on('data', (data) => {
        const log = data.toString();
        console.error(`[Job ${jobId}] STDERR: ${log}`);
        jobLogEmitter.emit('log', log);
    });

    dockerProcess.on('close', (code) => {
        console.log(`[Job ${jobId}] Docker process exited with code ${code}`);
        if (jobLogEmitters[jobId]) {
            jobLogEmitters[jobId].emit('log', `Docker process exited with code ${code}`);
            jobLogEmitters[jobId].emit('close', code);
        }
        delete jobLogEmitters[jobId];
        callback(code === 0 ? null : new Error(`[Job ${jobId}] Docker process exited with code ${code}`));
    });

    dockerProcess.on('error', (error) => {
        console.error(`[Job ${jobId}] Error starting Docker process: ${error.message}`);
        if (jobLogEmitters[jobId]) {
            jobLogEmitters[jobId].emit('log', `Error: ${error.message}`);
        }
        callback(new Error(`[Job ${jobId}] ${error.message}`));
    });
}

/**
 * Get the EventEmitter for a job's logs.
 * @param {string} jobId - The job ID.
 * @returns {EventEmitter|null} - The EventEmitter for the job logs or null if not found.
 */
function getJobLogEmitter(jobId) {
    if (!jobLogEmitters[jobId]) {
        const emitter = new EventEmitter();
        jobLogEmitters[jobId] = emitter;
    }
    return jobLogEmitters[jobId];
}

/**
 * Cleanup an emitter for a job.
 * @param {string} jobId - The job ID.
 */
function cleanupEmitter(jobId) {
    if (jobLogEmitters[jobId]) {
        console.log(`[Job ${jobId}] Cleaning up job emitter`);
        delete jobLogEmitters[jobId];
    } else {
        console.log(`[Job ${jobId}] No emitter found to clean up`);
    }
}

module.exports = {
    runDockerJob,
    getJobLogEmitter,
    cleanupEmitter,
};
