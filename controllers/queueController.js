const jobController = require('./jobController');
const logController = require('./logController');

const jobQueue = [];
let isProcessing = false;

// To track all jobs, including completed and failed
const allJobs = new Map();

/**
 * Enqueue a new job and start processing if not already.
 * @param {Object} job - The job to enqueue.
 */
function enqueueJob(job) {
    try {
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
    if (jobQueue.length === 0) return; // No jobs to process

    isProcessing = true;
    const currentJob = jobQueue.shift();
    currentJob.status = 'processing';

    try {
        console.log(`Processing job: ${currentJob.id}`);
        await jobController.processJob(currentJob); // Process the job
        currentJob.status = 'completed';
        logController.logJobCompletion(currentJob.id);
        console.log(`Job completed: ${currentJob.id}`);
    } catch (error) {
        currentJob.status = 'failed';
        logController.logJobFailure(currentJob.id, error);
        console.error(`Job failed: ${currentJob.id}. Error: ${error.message}`);
    } finally {
        isProcessing = false;
        processQueue(); // Process the next job
    }
}

module.exports = {
    enqueueJob,
    jobQueue,
    allJobs, // Exported for status checks
};
