// controllers/jobProcessor.js
const logController = require('./logController');
const { generateJSONFile } = require('./jsonGenerator');
const { logJobCompletion, logJobFailure } = require('./logController');
const dockerService = require('../services/dockerService');

/**
 * Process a job: generate JSON and run AlphaFold prediction.
 * @param {Object} job - The job to process.
 */
async function processJob(job) {
    try {
        // Step 1: Generate the JSON file
        const filePath = await generateJSONFile(job.filename, job.content);

        // Step 2: Invoke the Docker container to run AlphaFold
        await runAlphaFold(job, filePath);

        // Job status updates and logging are handled here
        logJobCompletion(job.id);
    } catch (error) {
        // Log the failure
        logJobFailure(job.id, error);
        // Re-throw the error to be handled by the caller
        throw error;
    }
}

/**
 * Function to run AlphaFold using Docker through dockerService.
 * @param {Object} job - The job containing necessary data.
 * @param {String} filePath - The path to the generated JSON file.
 */
function runAlphaFold(job, filePath) {
    return new Promise((resolve, reject) => {
        dockerService.runDockerJob(job.id, filePath, (error) => {
            if (error) {
                console.error(`AlphaFold execution error for job ${job.id}:`, error);
                return reject(error);
            }
            console.log(`AlphaFold job ${job.id} completed successfully.`);
            resolve();
        });
    });
}

module.exports = {
    processJob,
};
