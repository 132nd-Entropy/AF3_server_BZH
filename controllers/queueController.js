const jobController = require('./jobController');
const dockerService = require('../services/dockerService');
const logController = require('./logController'); // Import logController

// Add a Set to track jobs already being processed
const processedJobs = new Set();

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
        job.status = 'queued'; // Mark the job as queued
        jobQueue.push(job);   // Add the job to the queue
        allJobs.set(job.id, job); // Track the job in allJobs
        console.log(`Job enqueued: ${job.id} - ${job.filename}`);

        // Trigger queue processing only if no job is currently processing
        if (!isProcessing) {
            processQueue();
        }
    } catch (error) {
        console.error(`Failed to enqueue job: ${job.id}. Error: ${error.message}`);
    }
}


async function processQueue() {
    while (jobQueue.length > 0) {
        if (isProcessing) return;

        isProcessing = true;
        currentJob = jobQueue.shift();
        currentJob.status = 'processing';
        allJobs.set(currentJob.id, { ...currentJob });
        console.log(`Processing job: ${currentJob.id}`);

        try {
            console.log(`[Job ${currentJob.id}] Starting Docker container`);
            await new Promise((resolve, reject) => {
                dockerService.runDockerJob(
                    currentJob.id,
                    currentJob.filename,
                    (error) => {
                        if (error) {
                            currentJob.status = 'failed';
                            logController.logJobFailure(currentJob.id, error);
                            console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);
                            reject(error); // Mark job as failed
                        } else {
                            console.log(`[Job ${currentJob.id}] Docker job finished.`);
                            currentJob.status = 'completed';
                            logController.tailDockerLogs(currentJob.id, currentJob.processID);
                            resolve(); // Mark job as completed
                        }
                        allJobs.set(currentJob.id, { ...currentJob });
                    },
                    (containerId) => {
                        console.log(`[Job ${currentJob.id}] Docker container started with ID: ${containerId}`);
                        currentJob.processID = containerId;
                    }
                );
            });
        } catch (error) {
            console.error(`Error processing job ${currentJob.id}: ${error.message}`);
        } finally {
            isProcessing = false;
            currentJob = null;
        }
    }
    console.log('Job queue is empty.');
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

module.exports = {
    enqueueJob,
    processQueue,
    getQueueStatus,
};
