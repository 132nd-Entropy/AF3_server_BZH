import { fetchQueueStatus, getCurrentJob, reconnectToLogs } from './queueStatus.js';
//import { fetchCurrentLogs } from './logStreaming.js';
import { addMolecule } from './moleculeManager.js';
import { createJSONFile } from './jobSubmission.js';

document.addEventListener("DOMContentLoaded", () => {
    addMolecule(); // Adds the initial molecule block dynamically

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

    // Fetch queue status and initialize logs
    fetchQueueStatus().then(() => {
        const currentJob = getCurrentJob();
        if (currentJob && currentJob.id) {
            fetchCurrentLogs(currentJob.id); // Start streaming logs
        }
    });

    reconnectToLogs(); // Reconnect to logs on page load

    setInterval(fetchQueueStatus, 5000); // Poll every 5 seconds
});
