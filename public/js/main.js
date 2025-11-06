// Only import what we actually use now (no per-job SSE helpers)
import { fetchQueueStatus, getCurrentJob } from './queueStatus.js';
import { addMolecule } from './moleculeManager.js';
import { createJSONFile } from './jobSubmission.js';
import { handleOptionalInputChange } from './moleculeManager.js';

let currentJobId = null;
let consecutiveErrorCount = 0;
let queuePollingInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    console.log('[BOOT] main.js loaded');

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

    // Start polling the queue; no per-job SSE reconnections here
    initializeQueueStatusAndLogs();
    queuePollingInterval = setInterval(fetchQueueStatusAndUpdateLogs, 5000);
    addMolecule(); // Automatically add the first molecule block

    // 🔥 Unified live log stream (create ONCE and keep forever)
    if (!window.__unifiedEvt) {
        const logContainer =
            document.getElementById("logsDisplay") || // textarea (your current HTML)
            document.getElementById("log-output");    // optional <div> fallback

        try {
            const evt = new EventSource("/logs"); // unified backend endpoint
            window.__unifiedEvt = evt;            // guard against duplicates

            evt.onopen = () => console.log('[SSE] /logs opened');

            evt.onmessage = (e) => {
                if (!logContainer) {
                    console.log("LOG:", e.data);
                    return;
                }
                if (logContainer.tagName === "TEXTAREA") {
                    logContainer.value += e.data + "\n";
                    logContainer.scrollTop = logContainer.scrollHeight;
                } else {
                    const line = document.createElement("div");
                    line.textContent = e.data;
                    logContainer.appendChild(line);
                    logContainer.scrollTop = logContainer.scrollHeight;
                }
            };

            evt.onerror = (err) => {
                // Do NOT close the stream on transient errors; browser will retry, server sends keepalives
                console.warn("[SSE] /logs error (keeping connection):", err);
            };
        } catch (err) {
            console.error("Failed to connect to unified log stream:", err);
        }
    }

    window.addEventListener('beforeunload', () => {
        console.log('[BOOT] Page is unloading (this would drop SSE)');
    });
});

async function initializeQueueStatusAndLogs() {
    try {
        // No per-job SSE reconnect here
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

        // Keep queue UI state only; do NOT touch SSE here
        if (currentJob && currentJob.status === 'processing' && currentJob.id !== currentJobId) {
            console.log(`Switching UI focus to processing job ${currentJob.id}`);
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
        ligamentAmountInput.style.display = isLigand ? "inline-block" : "none";
        ligandAmountInput.value = isLigand ? "1" : "";
    }
}
