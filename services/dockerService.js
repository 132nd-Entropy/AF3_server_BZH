// services/dockerService.js

const { spawn } = require('child_process');
const EventEmitter = require('events');

const jobLogEmitters = {}; // Object to store per-job EventEmitters

exports.runDockerJob = (jobId, filePath, callback) => {
    const dockerCommand = [
        'run',
        '--rm',
        '-v', '/home/entropy/output_alphafold3:/home/entropy/output_alphafold3',
        '-v', '/opt/alphafold3_database:/opt/alphafold3_database',
        '-v', '/opt/alphafold3_model:/opt/alphafold3_model',
        '--gpus', 'all',
        'alphafold3',
        'python3', 'run_alphafold.py',
        `--json_path=${filePath}`,
        '--model_dir=/opt/alphafold3_model',
        '--db_dir=/opt/alphafold3_database',
        '--output_dir=/home/entropy/output_alphafold3'
    ];

    console.log(`Starting Docker container for job ${jobId} with command: docker ${dockerCommand.join(' ')}`);

    const dockerProcess = spawn('docker', dockerCommand);

    const jobLogEmitter = new EventEmitter();
    jobLogEmitters[jobId] = jobLogEmitter;

    dockerProcess.stdout.on('data', (data) => {
        const log = data.toString();
        console.log(log);
        jobLogEmitter.emit('log', log);
    });

    dockerProcess.stderr.on('data', (data) => {
        const log = data.toString();
        console.error(log);
        jobLogEmitter.emit('log', log);
    });

    dockerProcess.on('close', (code) => {
        console.log(`Docker process for job ${jobId} exited with code ${code}`);
        delete jobLogEmitters[jobId];
        if (code === 0) {
            callback(null);
        } else {
            callback(new Error(`Docker process exited with code ${code}`));
        }
    });

    dockerProcess.on('error', (error) => {
        console.error(`Error starting Docker process for job ${jobId}: ${error.message}`);
        jobLogEmitter.emit('log', `Error: ${error.message}`);
        callback(error);
    });
};

exports.getJobLogEmitter = (jobId) => {
    return jobLogEmitters[jobId];
};
