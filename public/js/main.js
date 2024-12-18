import { fetchQueueStatus, getCurrentJob, reconnectToLogs } from './queueStatus.js';
import { fetchCurrentLogs } from './logStreaming.js';
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
        await fetchQueueStatus(); // Fetch the latest queue status
        const currentJob = getCurrentJob();

        if (currentJob && currentJob.id !== currentJobId) {
            // If a new job is detected, switch to its logs
            console.log(`Switching to logs for new Job ${currentJob.id}`);
            currentJobId = null; // Temporarily unset to avoid premature updates
            await fetchCurrentLogs(currentJob.id); // Start streaming logs for the new job
            currentJobId = currentJob.id; // Update the current job ID on success
        } else if (!currentJob && currentJobId) {
            // If no job is processing, stop tracking logs
            console.log('No job is currently processing.');
            currentJobId = null;
        }

        consecutiveErrorCount = 0; // Reset error count on success
    } catch (error) {
        console.error('Error updating queue status and logs:', error);
        handlePollingError(); // Handle the error gracefully
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
