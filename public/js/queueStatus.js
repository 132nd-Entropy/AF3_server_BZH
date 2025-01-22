import { fetchCurrentLogs } from './logStreaming.js';

let currentJob = null; // Declare the current job globally
let currentJobId = null; // Track the current job ID for log streaming

export function getCurrentJob() {
    return currentJob; // Return the current job
}

export async function fetchQueueStatus() {
    try {
        const response = await fetch("/queue-status");
        if (!response.ok) {
            throw new Error(`Failed to fetch queue status: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Queue status data:", data);

        // 1. Find the currently processing job in the server data
        const processingJob = data.jobs.find((job) => job.status === 'processing');

        if (processingJob) {
            // We have a job that the server says is processing
            if (processingJob.id !== currentJobId) {
                // It's a different processing job than we had before, so switch logs
                console.log(`Switching to logs for new processing job ${processingJob.id}`);
                currentJobId = processingJob.id;
                fetchCurrentLogs(currentJobId);
            }
            currentJob = processingJob;
        } else {
            // The server did not list any 'processing' job
            if (currentJob && currentJob.status === 'processing') {
                // The server doesn't see a processing job, but we think we still have one
                // Possibly a race condition or the server is about to mark it completed
                console.log("No processing job listed, but we previously had one. Holding logs for one more cycle...");
            } else {
                // If there's definitely no job processing, or old job was completed/failed
                console.log("No job is currently processing. Clearing currentJob.");
                currentJob = null;
                currentJobId = null;
            }
        }

        // Update the UI elements
        updateUI(data);

    } catch (error) {
        console.error("Error fetching queue status:", error);
        handleError(error, "queue status");
    }
}
export async function reconnectToLogs() {
    try {
        // First, update queue status to figure out what job is processing
        await fetchQueueStatus();

        if (currentJob && currentJob.id) {
            console.log(`Reconnecting to logs for Job ${currentJob.id}...`);

            // Hit the reconnect-logs endpoint
            const reconnectResponse = await fetch(`/reconnect-logs?jobId=${currentJob.id}`);
            if (!reconnectResponse.ok) {
                throw new Error("Failed to reconnect to logs.");
            }

            // Restart streaming logs for the current job
            fetchCurrentLogs(currentJob.id);
        } else {
            console.log("No current job to reconnect to.");
        }
    } catch (error) {
        console.error("Error reconnecting to logs:", error);
        handleError(error, "log reconnection");
    }
}

function updateUI(data) {
    // 1. Show which job is processing (if any)
    const currentJobDisplay = document.getElementById("currentJobDisplay");
    if (currentJobDisplay) {
        currentJobDisplay.innerHTML = currentJob
            ? `<p>Currently Processing: <strong>${currentJob.filename}</strong></p>`
            : "<p>No job is currently processing.</p>";
    }

    // 2. Show queue of jobs that are still 'queued'
    const queueList = document.getElementById("queueList");
    if (queueList) {
        const queue = data?.jobs.filter((job) => job.status === 'queued') || [];
        queueList.innerHTML = queue.length
            ? `<p><strong>Pending Jobs:</strong></p><ul>${queue
                  .map((job, index) => `<li>Position ${index + 1}: ${job.filename}</li>`)
                  .join("")}</ul>`
            : "<p>No jobs in the queue.</p>";
    }

    // 3. Show completed jobs
    const completedJobsList = document.getElementById("completedJobsList");
    if (completedJobsList) {
        const completedJobs = data?.jobs.filter((job) => job.status === 'completed') || [];
        completedJobsList.innerHTML = completedJobs.length
            ? `<p><strong>Completed Jobs:</strong></p><ul>${completedJobs
                  .map((job) => `<li>${job.filename}</li>`)
                  .join("")}</ul>`
            : "<p>No completed jobs yet.</p>";
    }
}

function handleError(error, context) {
    console.error(`Error in ${context}:`, error);

    const currentJobDisplay = document.getElementById("currentJobDisplay");
    if (currentJobDisplay) {
        currentJobDisplay.innerHTML = `<p>Error fetching ${context}.</p>`;
    }

    const queueList = document.getElementById("queueList");
    if (queueList) {
        queueList.innerHTML = `<p>Unable to load ${context}.</p>`;
    }

    const completedJobsList = document.getElementById("completedJobsList");
    if (completedJobsList) {
        completedJobsList.innerHTML = `<p>Unable to load completed jobs.</p>`;
    }
}
