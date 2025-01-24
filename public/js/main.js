import { fetchQueueStatus, getCurrentJob, reconnectToLogs } from './queueStatus.js';
import { fetchCurrentLogs, reconnectToPreviousLog } from './logStreaming.js';
import { addMolecule } from './moleculeManager.js';
import { createJSONFile } from './jobSubmission.js';

let currentJobId = null;
let consecutiveErrorCount = 0;

document.addEventListener("DOMContentLoaded", () => {
    const lipidCheckbox = document.getElementById("addLipidsCheckbox");
    if (lipidCheckbox) lipidCheckbox.addEventListener("change", toggleLipidOptions);

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

    document.getElementById("moleculeContainer").addEventListener("change", function(event) {
    if (event.target.classList.contains("moleculeTypeDropdown")) {
        const moleculeId = event.target.getAttribute("id").replace("molecule", "");
        toggleLigandAmountField(event.target);
    }
});


    reconnectToPreviousLog();
    initializeQueueStatusAndLogs();
    setInterval(fetchQueueStatusAndUpdateLogs, 5000);
});


async function initializeQueueStatusAndLogs() {
    try {
        await reconnectToLogs();
        consecutiveErrorCount = 0;
    } catch (error) {
        console.error('Error initializing queue status and logs:', error);
        handlePollingError();
    }
}

async function fetchQueueStatusAndUpdateLogs() {
    try {
        await fetchQueueStatus();
        const currentJob = getCurrentJob();

        if (currentJob && currentJob.status === 'processing' && currentJob.id !== currentJobId) {
            console.log(`Switching to logs for new processing job ${currentJob.id}`);
            currentJobId = null;
            await fetchCurrentLogs(currentJob.id);
            currentJobId = currentJob.id;
        } else if (!currentJob && currentJobId) {
            console.log('No job is currently processing.');
            currentJobId = null;
        }

        consecutiveErrorCount = 0;
    } catch (error) {
        console.error('Error updating queue status and logs:', error);
        handlePollingError();
    }
}

function handlePollingError() {
    consecutiveErrorCount++;
    if (consecutiveErrorCount > 3) {
        console.warn('Too many consecutive errors. Pausing polling.');
        clearInterval(fetchQueueStatusAndUpdateLogs);
    }
}

function toggleLipidOptions() {
    const checkbox = document.getElementById("addLipidsCheckbox");
    const lipidTypeDropdown = document.getElementById("lipidTypeDropdown");
    const lipidAmountDropdown = document.getElementById("lipidAmountDropdown");

    lipidTypeDropdown.disabled = !checkbox.checked;
    lipidAmountDropdown.disabled = !checkbox.checked;
}


function toggleLigandAmountField(selectElement) {
    const moleculeId = selectElement.id.replace("molecule", "");
    const ligandAmountInput = document.getElementById(`ligandAmount${moleculeId}`);
    ligandAmountInput.style.display = selectElement.value === "ligand" ? "inline-block" : "none";
    ligandAmountInput.value = selectElement.value === "ligand" ? "1" : "";
}
