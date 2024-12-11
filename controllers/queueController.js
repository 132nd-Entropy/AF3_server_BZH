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
        debugState(); // Debugging current state
        processQueue(); // Start processing the queue
    } catch (error) {
        console.error(`Failed to enqueue job: ${job.id}. Error: ${error.message}`);
    }
}

async function processQueue() {
    if (isProcessing) {
        console.log('A job is already processing. Waiting for it to complete.');
        return; // Prevent new jobs from starting while one is running
    }

    if (jobQueue.length === 0) {
        currentJob = null; // No jobs left to process
        console.log('No jobs left in the queue.');
        return;
    }

    isProcessing = true; // Set processing to true
    currentJob = jobQueue.shift(); // Take the next job
    currentJob.status = 'processing';
    allJobs.set(currentJob.id, { ...currentJob }); // Update allJobs

    console.log(`Processing job: ${currentJob.id}`);

    try {
        console.log(`[Job ${currentJob.id}] Starting Docker container`);

        // Start the Docker job
        dockerService.runDockerJob(currentJob.id, currentJob.filename, (error) => {
            if (error) {
                currentJob.status = 'failed';
                console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);
                logController.logJobFailure(currentJob.id, error);
            } else {
                currentJob.status = 'completed';
                console.log(`Job completed: ${currentJob.id}`);
                logController.logJobCompletion(currentJob.id);
            }

            // Update allJobs with the final status
            allJobs.set(currentJob.id, { ...currentJob });

            // Reset state and move to the next job
            isProcessing = false; // Allow the next job to be processed
            currentJob = null;
            processQueue(); // Process the next job in the queue
        });
    } catch (error) {
        currentJob.status = 'failed';
        console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);
        logController.logJobFailure(currentJob.id, error);
        allJobs.set(currentJob.id, { ...currentJob });

        // Reset state and move to the next job
        isProcessing = false; // Allow the next job to be processed
        currentJob = null;
        processQueue(); // Process the next job in the queue
    }
}





/**
 * Get the current status of the queue and jobs.
 */
function getQueueStatus() {
    const jobs = [
        ...(currentJob ? [{ ...currentJob, status: 'processing' }] : []),
        ...jobQueue.map((job, index) => ({ ...job, position: index + 1, status: 'queued' })),
        ...Array.from(allJobs.values()).filter((job) => job.status === 'completed' || job.status === 'failed'),
    ];

    console.log('--- Debugging /queue-status ---');
    console.log('isProcessing:', isProcessing);
    console.log('currentJob:', currentJob);
    console.log('jobQueue:', JSON.stringify(jobQueue, null, 2));
    console.log('allJobs:', JSON.stringify(Array.from(allJobs.values()), null, 2));
    console.log('jobs:', JSON.stringify(jobs, null, 2));

    return {
        isProcessing,
        currentJob,
        queue: jobQueue.map((job, index) => ({
            ...job,
            position: index + 1,
        })),
        allJobs: Array.from(allJobs.values()),
        jobs,
    };
}

/**
 * Debugging utility: Log the current state of the queue
 */
function debugState() {
    console.log('--- Debugging Queue State ---');
    console.log('Job Queue:', jobQueue);
    console.log('Current Job:', currentJob);
    console.log('All Jobs:', Array.from(allJobs.values()));
    console.log('-----------------------------');
}

module.exports = {
    enqueueJob,
    processQueue,
    getQueueStatus, // Export queue status for use in endpoints
    debugState,
};
