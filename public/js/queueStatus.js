// js/queuestatus.js
import { startServerLogStreaming } from './logStreaming.js';

let currentJob = null; // Declare currentJob globally in queuestatus.js

export async function fetchQueueStatus() {
    try {
        const response = await fetch("/queue-status");
        if (!response.ok) throw new Error(`Failed to fetch queue status: ${response.statusText}`);

        const data = await response.json();
        console.log('Queue status data:', data);

        // Assign the currently processing job to global currentJob
        currentJob = data.jobs.find(job => job.status === 'processing');

        // Extract queued and completed jobs
        const queue = data.jobs.filter(job => job.status === 'queued');
        const completedJobs = data.jobs.filter(job => job.status === 'completed');

        // Update the currently processing job display
        document.getElementById("currentJobDisplay").innerHTML = currentJob
            ? `<p>Currently Processing: <strong>${currentJob.filename}</strong></p>`
            : "<p>No job is currently processing.</p>";

        // Update the pending jobs list
        document.getElementById("queueList").innerHTML = queue.length
            ? `<p><strong>Pending Jobs:</strong></p><ul>${queue.map((job, index) => `<li>Position ${index + 1}: ${job.filename}</li>`).join("")}</ul>`
            : "<p>No jobs in the queue.</p>";

        // Update the completed jobs list
        document.getElementById("completedJobsList").innerHTML = completedJobs.length
            ? `<p><strong>Completed Jobs:</strong></p><ul>${completedJobs.map(job => `<li>${job.filename}</li>`).join("")}</ul>`
            : "<p>No completed jobs yet.</p>";
    } catch (error) {
        console.error("Error fetching queue status:", error);

        // Handle error in fetching queue status
        document.getElementById("currentJobDisplay").innerHTML = "<p>Error fetching queue status.</p>";
        document.getElementById("queueList").innerHTML = "<p>Unable to load queue.</p>";
        document.getElementById("completedJobsList").innerHTML = "<p>Unable to load completed jobs.</p>";
    }
}

export function getCurrentJob() {
    return currentJob; // Provide a way for main.js to access the current job
}

export async function reconnectToLogs() {
    try {
        await fetchQueueStatus(); // Fetch queue status to update global currentJob

        const currentJob = getCurrentJob(); // Access the updated currentJob

        if (currentJob && currentJob.id) {
            console.log(`Reconnecting to logs for job ${currentJob.id}...`);

            // Call the reconnect-logs endpoint
            const reconnectResponse = await fetch(`/reconnect-logs?jobId=${currentJob.id}`);
            if (!reconnectResponse.ok) throw new Error('Failed to reconnect to logs.');

            // Start streaming logs again
            fetchCurrentLogs(currentJob.id); // Ensure this function exists and is implemented
        } else {
            console.log('No current job to reconnect to.');
        }
    } catch (error) {
        console.error('Error reconnecting to logs:', error);
    }
}

