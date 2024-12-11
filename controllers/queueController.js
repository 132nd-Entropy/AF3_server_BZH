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
    console.log('Entering processQueue');
    if (isProcessing) {
        console.log('Already processing a job. Exiting processQueue.');
        return;
    }

    if (jobQueue.length === 0) {
        console.log('Job queue is empty. Exiting processQueue.');
        currentJob = null;
        return;
    }

    isProcessing = true; // Lock the processing state immediately
    currentJob = jobQueue.shift(); // Take the next job
    currentJob.status = 'processing';
    allJobs.set(currentJob.id, { ...currentJob });
    console.log(`Processing job: ${currentJob.id}`);

    try {
        console.log(`[Job ${currentJob.id}] Starting Docker container`);
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

            // Update allJobs and reset processing
            allJobs.set(currentJob.id, { ...currentJob });
            isProcessing = false;
            currentJob = null;
            processQueue(); // Process the next job
        });
    } catch (error) {
        currentJob.status = 'failed';
        logController.logJobFailure(currentJob.id, error);
        console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);
        allJobs.set(currentJob.id, { ...currentJob });

        // Reset processing
        isProcessing = false;
        currentJob = null;
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
