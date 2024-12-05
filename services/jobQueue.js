// services/jobQueue.js
const path = require('path'); // Ensure this is at the top
const dockerService = require('./dockerService');
const { v4: uuidv4 } = require('uuid');

let jobQueue = [];
let completedJobs = [];
let isProcessing = false;
let currentJob = null;

exports.addJob = (job) => {
    const jobId = uuidv4();
    job.id = jobId;
    jobQueue.push(job);
    processQueue();
    return jobId; // Return the job ID to the caller
};

exports.getStatus = () => {
    return {
        isProcessing,
        currentJob: currentJob ? {
            id: currentJob.id,
            fileName: path.basename(currentJob.filePath),
        } : null,
        queue: jobQueue.map((job, index) => ({
            position: index + 1,
            id: job.id,
            fileName: path.basename(job.filePath),
        })),
        completedJobs: completedJobs.map((job) => ({
            id: job.id,
            fileName: path.basename(job.filePath),
            finishedAt: job.timestamp,
        })),
    };
};

function processQueue() {
    if (isProcessing || jobQueue.length === 0) return;

    isProcessing = true;
    currentJob = jobQueue.shift();

    // Pass jobId to runDockerJob
    dockerService.runDockerJob(currentJob.id, currentJob.filePath, (error) => {
        isProcessing = false;
        if (error) {
            console.error('Error processing job:', error);
        } else {
            console.log('Job completed:', currentJob.filePath);
            completedJobs.push({
                ...currentJob,
                timestamp: new Date(),
            });
        }
        currentJob = null;
        processQueue(); // Process the next job in the queue
    });
}
