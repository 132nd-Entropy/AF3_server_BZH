import { fetchQueueStatus, getCurrentJob, reconnectToLogs } from './queueStatus.js';
import { fetchCurrentLogs, reconnectToPreviousLog } from './logStreaming.js';
import { addMolecule } from './moleculeManager.js';
import { createJSONFile } from './jobSubmission.js';
import { handleOptionalInputChange } from './moleculeManager.js';

let currentJobId = null;
let consecutiveErrorCount = 0;
let queuePollingInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    // Optional input dropdown listener for dynamic lipid creation
    const optionalInputDropdown = document.getElementById("optionalInputDropdown");
    if (optionalInputDropdown) {
        optionalInputDropdown.addEventListener("change", handleOptionalInputChange);
    } else {
        console.error('Element "optionalInputDropdown" not found.');
    }

    // Add molecule button listener
    const addMoleculeButton = document.getElementById("addMoleculeButton");
    if (addMoleculeButton) {
        addMoleculeButton.addEventListener("click", addMolecule);
    } else {
        console.error('Element "addMoleculeButton" not found.');
    }

    // Start prediction button listener
    const startPredictionButton = document.getElementById("startPredictionButton");
    if (startPredictionButton) {
        startPredictionButton.addEventListener("click", createJSONFile);
    } else {
        console.error('Element "startPredictionButton" not found.');
    }

    // Molecule container change listener
    const moleculeContainer = document.getElementById("moleculeContainer");
    if (moleculeContainer) {
        moleculeContainer.addEventListener("change", function(event) {
            if (event.target.classList.contains("moleculeTypeDropdown")) {
                toggleLigandAmountField(event.target);
            }
        });
    } else {
        console.error('Element "moleculeContainer" not found.');
    }

    // Initial reconnection and polling setup
    reconnectToPreviousLog();
    initializeQueueStatusAndLogs();
    queuePollingInterval = setInterval(fetchQueueStatusAndUpdateLogs, 5000);
    addMolecule(); // Automatically add the first molecule block
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
        clearInterval(queuePollingInterval);
    }
}

function toggleLipidOptions() {
    const checkbox = document.getElementById("addLipidsCheckbox");
    const lipidTypeDropdown = document.getElementById("lipidTypeDropdown");
    const lipidAmountDropdown = document.getElementById("lipidAmountDropdown");

    if (!checkbox || !lipidTypeDropdown || !lipidAmountDropdown) {
        console.error("One or more lipid toggle elements not found.");
        return;
    }

    const enabled = checkbox.checked;
    lipidTypeDropdown.disabled = !enabled;
    lipidAmountDropdown.disabled = !enabled;

    console.log(`Lipid options ${enabled ? 'enabled' : 'disabled'}`);
}

function toggleLigandAmountField(selectElement) {
    const moleculeId = selectElement.id.replace("molecule", "");
    const ligandAmountInput = document.getElementById(`ligandAmount${moleculeId}`);

    if (ligandAmountInput) {
        const isLigand = selectElement.value === "ligand";
        ligandAmountInput.style.display = isLigand ? "inline-block" : "none";
        ligandAmountInput.value = isLigand ? "1" : "";
    }
}
