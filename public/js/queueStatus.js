import { startServerLogStreaming, fetchCurrentLogs } from './logStreaming.js';

let currentJob = null;

export async function fetchQueueStatus() {
    try {
        const response = await fetch("/queue-status");
        if (!response.ok) throw new Error(`Failed to fetch queue status: ${response.statusText}`);

        const data = await response.json();
        console.log('Queue status data:', data);

        currentJob = data.jobs.find(job => job.status === 'processing');

        const queue = data.jobs.filter(job => job.status === 'queued');
        const completedJobs = data.jobs.filter(job => job.status === 'completed');

        const currentJobDisplay = document.getElementById("currentJobDisplay");
        if (currentJobDisplay) {
            currentJobDisplay.innerHTML = currentJob
                ? `<p>Currently Processing: <strong>${currentJob.filename}</strong></p>`
                : "<p>No job is currently processing.</p>";
        }

        const queueList = document.getElementById("queueList");
        if (queueList) {
            queueList.innerHTML = queue.length
                ? `<p><strong>Pending Jobs:</strong></p><ul>${queue.map((job, index) => `<li>Position ${index + 1}: ${job.filename}</li>`).join("")}</ul>`
                : "<p>No jobs in the queue.</p>";
        }

        const completedJobsList = document.getElementById("completedJobsList");
        if (completedJobsList) {
            completedJobsList.innerHTML = completedJobs.length
                ? `<p><strong>Completed Jobs:</strong></p><ul>${completedJobs.map(job => `<li>${job.filename}</li>`).join("")}</ul>`
                : "<p>No completed jobs yet.</p>";
        }
    } catch (error) {
        console.error("Error fetching queue status:", error);
        handleError(error, "queue status");
    }
}

export function getCurrentJob() {
    return currentJob;
}

export async function reconnectToLogs() {
    try {
        await fetchQueueStatus();

        const currentJob = getCurrentJob();
        if (currentJob && currentJob.id) {
            console.log(`Reconnecting to logs for job ${currentJob.id}...`);

            const reconnectResponse = await fetch(`/reconnect-logs?jobId=${currentJob.id}`);
            if (!reconnectResponse.ok) throw new Error(`Failed to reconnect to logs for job ${currentJob.id}.`);

            const reconnectData = await reconnectResponse.json();
            console.log(reconnectData.message || "Reconnected successfully.");

            fetchCurrentLogs(currentJob.id);
        } else {
            console.log('No current job to reconnect to.');
        }
    } catch (error) {
        console.error('Error reconnecting to logs:', error);
        handleError(error, "log reconnection");
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
