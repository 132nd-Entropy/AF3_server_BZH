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
        const processingJobs = data.jobs.filter(j => j.status === 'processing');

if (processingJobs.length === 1) {
  currentJob = processingJobs[0];
} else if (processingJobs.length > 1) {
  console.warn("Unexpected: multiple processing jobs!");
  // Optionally handle this scenario
} else {
  currentJob = null;
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
