import { fetchQueueStatus, getCurrentJob, reconnectToLogs } from './queueStatus.js';
import { fetchCurrentLogs, reconnectToPreviousLog } from './logStreaming.js';
import { addMolecule } from './moleculeManager.js';
import { createJSONFile } from './jobSubmission.js';

let currentJobId = null; // Track the current job ID for log streaming
let consecutiveErrorCount = 0; // Track consecutive errors during polling

document.addEventListener("DOMContentLoaded", () => {
    addMolecule(); // Dynamically add the initial molecule block

    const addMoleculeButton = document.getElementById("addMoleculeButton");
    if (addMoleculeButton) {
        addMoleculeButton.addEventListener("click", addMolecule);
    } else {
        console.error('Element "addMoleculeButton" not found.');
    }

    const startPredictionButton = document.getElementById("startPredictionButton");
    if (startPredictionButton) {
        startPredictionButton.addEventListener("click", createJSONFile);
    } else {
        console.error('Element "startPredictionButton" not found.');
    }

    // Reconnect to any existing job logs after a page reload
    reconnectToPreviousLog();

    // Initial fetch of queue status and logs
    initializeQueueStatusAndLogs();

    // Set up polling for queue status every 5 seconds
    setInterval(fetchQueueStatusAndUpdateLogs, 5000);
});

/**
 * Initialize queue status and logs.
 * This function is called once on page load to fetch the queue status and set up the log stream.
 */
async function initializeQueueStatusAndLogs() {
    try {
        await reconnectToLogs(); // Attempt to reconnect to logs and fetch queue status
        consecutiveErrorCount = 0; // Reset error count on success
    } catch (error) {
        console.error('Error initializing queue status and logs:', error);
        handlePollingError(); // Handle the error gracefully
    }
}

/**
 * Polls queue status and updates the logs for the current job dynamically.
 */
async function fetchQueueStatusAndUpdateLogs() {
    try {
        // 1. Update queue status (this calls fetchQueueStatus in queueStatus.js)
        await fetchQueueStatus();

        // 2. Retrieve the currentJob from queueStatus.js
        const currentJob = getCurrentJob();

        // 3. Only switch logs if the currentJob is 'processing' and differs from the tracked jobId
        if (
            currentJob &&
            currentJob.status === 'processing' &&
            currentJob.id !== currentJobId
        ) {
            console.log(`Switching to logs for new processing job ${currentJob.id}`);
            currentJobId = null; // Unset so we can set a new SSE
            await fetchCurrentLogs(currentJob.id);
            currentJobId = currentJob.id;
        } else if (!currentJob && currentJobId) {
            console.log('No job is currently processing.');
            currentJobId = null;
        }

        // 4. Reset error count on success
        consecutiveErrorCount = 0;
    } catch (error) {
        console.error('Error updating queue status and logs:', error);
        handlePollingError();
    }
}

/**
 * Handle polling errors gracefully.
 */
function handlePollingError() {
    consecutiveErrorCount++;
    if (consecutiveErrorCount > 3) {
        console.warn('Too many consecutive errors. Pausing polling.');
        // Optionally pause polling or notify the user
    }
}
