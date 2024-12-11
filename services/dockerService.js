const { spawn } = require('child_process');
const fs = require('fs');
const EventEmitter = require('events');

const jobLogEmitters = {}; // Object to store per-job EventEmitters

exports.runDockerJob = (jobId, filePath, callback) => {
    // Ensure filePath has the .json extension
    const filename = filePath.endsWith('.json') ? filePath : `${filePath}.json`;

    // Construct the full path
    const fullPath = `/home/entropy/AF3_server_BZH/job_data/${filename}`;
    console.log(`[Job ${jobId}] Full file path: ${fullPath}`);

    // Check if the file exists
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

    // Create a new EventEmitter for this job
    const jobLogEmitter = new EventEmitter();
    jobLogEmitters[jobId] = jobLogEmitter;

    // Listen for stdout data
    dockerProcess.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(`[Job ${jobId}] STDOUT: ${log}`);
        jobLogEmitter.emit('log', log);
    });

    // Listen for stderr data
    dockerProcess.stderr.on('data', (data) => {
        const log = data.toString();
        console.error(`[Job ${jobId}] STDERR: ${log}`);
        jobLogEmitter.emit('log', log);
    });

    // Handle process close event
    dockerProcess.on('close', (code) => {
        console.log(`[Job ${jobId}] Docker process exited with code ${code}`);
        if (jobLogEmitters[jobId]) {
            jobLogEmitters[jobId].emit('log', `Docker process exited with code ${code}`);
            jobLogEmitters[jobId].emit('close', code); // Signal job completion
        }
        delete jobLogEmitters[jobId]; // Clean up the emitter
        if (code === 0) {
            callback(null); // Job succeeded
        } else {
            callback(new Error(`[Job ${jobId}] Docker process exited with code ${code}`)); // Job failed
        }
    });

    // Handle process error event
    dockerProcess.on('error', (error) => {
        console.error(`[Job ${jobId}] Error starting Docker process: ${error.message}`);
        if (jobLogEmitters[jobId]) {
            jobLogEmitters[jobId].emit('log', `Error: ${error.message}`);
        }
        callback(new Error(`[Job ${jobId}] ${error.message}`));
    });
};

/**
 * Get the EventEmitter for a job's logs.
 * @param {string} jobId - The job ID.
 * @returns {EventEmitter|null} - The EventEmitter for the job logs or null if not found.
 */
exports.getJobLogEmitter = (jobId) => {
    if (!jobLogEmitters[jobId]) {
        const emitter = new EventEmitter();
        jobLogEmitters[jobId] = emitter;

        // Simulate log generation for testing
        setTimeout(() => emitter.emit('log', `Log entry for job ${jobId}`), 500);
        setTimeout(() => emitter.emit('log', `Final log for job ${jobId}`), 1000);
        setTimeout(() => {
            emitter.emit('close', 0); // Simulate job completion
            delete jobLogEmitters[jobId];
        }, 1500);
    }
    return jobLogEmitters[jobId];
};
