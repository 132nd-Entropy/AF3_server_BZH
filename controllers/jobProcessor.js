// controllers/jobProcessor.js

const { generateJSONFile } = require('./jsonGenerator');
const { logJobCompletion, logJobFailure } = require('./logController');

/**
 * Process a job: generate JSON and run AlphaFold prediction.
 * @param {Object} job - The job to process.
 */
async function processJob(job) {
    try {
        // Step 1: Generate the JSON file
        await generateJSONFile(job.filename, job.content);

        // Step 2: Invoke the Docker container to run AlphaFold
        await runAlphaFold(job);

        // Job status updates and logging are handled in queueController.js
    } catch (error) {
        // Re-throw the error to be handled by the caller
        throw error;
    }
}

/**
 * Function to run AlphaFold using Docker.
 * @param {Object} job - The job containing necessary data.
 */
function runAlphaFold(job) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');

        // Example Docker command; adjust according to your setup
        const command = `docker run --rm -v /path/to/input:/input -v /path/to/output:/output alphafold:latest /input/${job.filename}.json`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`AlphaFold execution error for job ${job.id}:`, error);
                return reject(error);
            }
            console.log(`AlphaFold output for job ${job.id}:`, stdout);
            if (stderr) {
                console.error(`AlphaFold stderr for job ${job.id}:`, stderr);
            }
            resolve();
        });
    });
}

module.exports = {
    processJob,
};
