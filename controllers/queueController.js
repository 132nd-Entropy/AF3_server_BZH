const jobController = require('./jobController');
const logController = require('./logController');
const dockerService = require('../services/dockerService');

const jobQueue = [];
let isProcessing = false;
let currentJob = null; // Explicitly track the currently processing job

// To track all jobs, including completed and failed
const allJobs = new Map();

/**
 * Enqueue a new job and start processing if not already.
 * @param {Object} job - The job to enqueue.
 */
function enqueueJob(job) {
    try {
        job.status = 'queued'; // Ensure the job has a default status
        jobQueue.push(job);
        allJobs.set(job.id, job); // Add to allJobs for status tracking
        console.log(`Job enqueued: ${job.id} - ${job.filename}`);
        processQueue(); // Start processing the queue
    } catch (error) {
        console.error(`Failed to enqueue job: ${job.id}. Error: ${error.message}`);
    }
}

/**
 * Process the next job in the queue.
 */
async function processQueue() {
    if (isProcessing) return; // Already processing a job
    if (jobQueue.length === 0) {
        currentJob = null; // No jobs left to process
        return;
    }

    isProcessing = true;
    currentJob = jobQueue.shift(); // Take the next job
    currentJob.status = 'processing';
    allJobs.set(currentJob.id, { ...currentJob }); // Update status in allJobs

    try {
        console.log(`Starting job: ${currentJob.id} - ${currentJob.filename}`);

        // Process the job (you can add pre-processing here if needed)
        await jobController.processJob(currentJob);

        // Start the Docker job
        dockerService.runDockerJob(currentJob.id, currentJob.filename, (error) => {
            if (error) {
                currentJob.status = 'failed';
                logController.logJobFailure(currentJob.id, error);
                console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);
            } else {
                currentJob.status = 'completed';
                logController.logJobCompletion(currentJob.id);
                console.log(`Job completed: ${currentJob.id}`);
            }

            // Update allJobs with the final status
            allJobs.set(currentJob.id, { ...currentJob });

            // Move to the next job after this one finishes
            isProcessing = false;
            currentJob = null; // Clear the current job
            processQueue();
        });
    } catch (error) {
        currentJob.status = 'failed';
        logController.logJobFailure(currentJob.id, error);
        console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);

        // Update allJobs with the failure status
        allJobs.set(currentJob.id, { ...currentJob });

        // Reset processing and move to the next job
        isProcessing = false;
        currentJob = null; // Clear the current job
        processQueue();
    }
}

/**
 * Get the current status of the queue and jobs.
 */
function getQueueStatus() {
    const jobs = [
        ...(currentJob ? [{ ...currentJob, status: 'processing' }] : []),
        ...jobQueue.map((job, index) => ({ ...job, position: index + 1, status: 'queued' })),
        ...Array.from(allJobs.values()).filter((job) => job.status === 'completed'),
    ];

    return {
        isProcessing,
        currentJob,
        queue: jobQueue.map((job, index) => ({
            ...job,
            position: index + 1,
        })),
        allJobs: Array.from(allJobs.values()),
        jobs, // Consolidated job list for easier frontend consumption
    };
}

/**
 * Debugging utility: Log the current state of the queue
 */
function debugQueueState() {
    console.log('--- Queue State ---');
    console.log('Job Queue:', jobQueue);
    console.log('Current Job:', currentJob);
    console.log('All Jobs:', Array.from(allJobs.values()));
    console.log('-------------------');
}

module.exports = {
    enqueueJob,
    processQueue,
    getQueueStatus, // Export queue status for use in endpoints
    debugQueueState,
};
