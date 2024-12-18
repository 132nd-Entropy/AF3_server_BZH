import { fetchCurrentLogs } from './logStreaming.js';

let currentJob = null; // Declare the current job globally
let currentJobId = null; // Track the current job ID for log streaming

export function getCurrentJob() {
    return currentJob; // Return the current job
}

export async function fetchQueueStatus() {
    try {
        const response = await fetch("/queue-status");
        if (!response.ok) throw new Error(`Failed to fetch queue status: ${response.statusText}`);

        const data = await response.json();
        console.log("Queue status data:", data);

        // Find the currently processing job
        const processingJob = data.jobs.find(job => job.status === 'processing');
        if (processingJob) {
            if (processingJob.id !== currentJobId) {
                // New job detected; start streaming its logs
                currentJobId = processingJob.id;
                console.log(`Switching to logs for Job ${currentJobId}`);
                fetchCurrentLogs(currentJobId); // Start streaming logs for the new job
            }
            currentJob = processingJob; // Update the global current job
        } else {
            // No processing job
            if (currentJobId) {
                console.log("No job is currently processing.");
            }
            currentJobId = null;
            currentJob = null; // Clear the global current job
        }

        updateUI(data); // Update the UI with the latest queue status
    } catch (error) {
        console.error("Error fetching queue status:", error);
        handleError(error, "queue status");
    }
}

export async function reconnectToLogs() {
    try {
        await fetchQueueStatus(); // Update the queue status and current job

        if (currentJob && currentJob.id) {
            console.log(`Reconnecting to logs for Job ${currentJob.id}...`);

            // Call the reconnect-logs endpoint
            const reconnectResponse = await fetch(`/reconnect-logs?jobId=${currentJob.id}`);
            if (!reconnectResponse.ok) throw new Error("Failed to reconnect to logs.");

            // Start streaming logs for the current job
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
    // Update the currently processing job display
    const currentJobDisplay = document.getElementById("currentJobDisplay");
    if (currentJobDisplay) {
        currentJobDisplay.innerHTML = currentJob
            ? `<p>Currently Processing: <strong>${currentJob.filename}</strong></p>`
            : "<p>No job is currently processing.</p>";
    }

    // Update the pending jobs list
    const queueList = document.getElementById("queueList");
    if (queueList) {
        const queue = data?.jobs.filter(job => job.status === 'queued') || [];
        queueList.innerHTML = queue.length
            ? `<p><strong>Pending Jobs:</strong></p><ul>${queue.map((job, index) => `<li>Position ${index + 1}: ${job.filename}</li>`).join("")}</ul>`
            : "<p>No jobs in the queue.</p>";
    }

    // Update the completed jobs list
    const completedJobsList = document.getElementById("completedJobsList");
    if (completedJobsList) {
        const completedJobs = data?.jobs.filter(job => job.status === 'completed') || [];
        completedJobsList.innerHTML = completedJobs.length
            ? `<p><strong>Completed Jobs:</strong></p><ul>${completedJobs.map(job => `<li>${job.filename}</li>`).join("")}</ul>`
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
