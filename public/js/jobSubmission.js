import { fetchQueueStatus } from './queueStatus.js';
//import { fetchCurrentLogs } from './logStreaming.js';

// Unified error reporting function
function showError(message) {
    console.error(message);
    alert(message);
}

export async function createJSONFile() {
    const projectName = document.getElementById("projectName").value.trim();
    if (!projectName) {
        showError("Please enter a Prediction Name.");
        return;
    }

    const moleculeBlocks = document.querySelectorAll(".molecule-block");
    if (moleculeBlocks.length === 0) {
        showError("Please add at least one molecule.");
        return;
    }

    let errorOccurred = false;
    const sequences = [];
    const idLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let moleculeCounter = 0;

    moleculeBlocks.forEach((moleculeBlock, index) => {
        if (errorOccurred) return;

        const moleculeId = moleculeBlock.getAttribute("data-molecule-id");

        const moleculeTypeElement = document.getElementById(`molecule${moleculeId}`);
        const sequenceElement = document.getElementById(`sequence${moleculeId}`);
        const errorField = document.getElementById(`error${moleculeId}`);

        if (!moleculeTypeElement || !sequenceElement || !errorField) {
            showError(`Elements with IDs molecule${moleculeId}, sequence${moleculeId}, or error${moleculeId} not found.`);
            errorOccurred = true;
            return;
        }

        const moleculeType = moleculeTypeElement.value.toLowerCase();
        const input = sequenceElement.value.trim() || null;

        if (!input) {
            showError(`Please enter input for Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }

        if (errorField.innerText) {
            showError(`Validation error in Molecule ${index + 1}: ${errorField.innerText}`);
            errorOccurred = true;
            return;
        }

        const moleculeID = generateLipidId(moleculeCounter);
        moleculeCounter++;

        let sequenceObject = {};

        if (["protein", "dna", "rna"].includes(moleculeType)) {
            sequenceObject[moleculeType] = {
                id: moleculeID,
                sequence: input
            };
        } else if (["ligand", "ion"].includes(moleculeType)) {
            sequenceObject[moleculeType] = {
                id: moleculeID,
                ccdCodes: [input]
            };
        } else {
            showError(`Unsupported molecule type for Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }

        sequences.push(sequenceObject);
    });

    if (errorOccurred) return;

    // Check if the "Add Lipids" checkbox is checked
    const addLipidsChecked = document.getElementById("addLipidsCheckbox").checked;
    if (addLipidsChecked) {
        for (let i = 0; i < 30; i++) {
            sequences.push({
                ligand: {
                    id: generateLipidId(moleculeCounter),
                    ccdCodes: ["OLA"]
                }
            });
            moleculeCounter++;
        }
    }

    const jsonData = {
        name: projectName,
        sequences: sequences,
        dialect: "alphafold3",
        version: 1,
        modelSeeds: [1]
    };

    try {
        const response = await fetch("/create-json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filename: projectName,
                content: jsonData,
            }),
        });

        const result = await response.json();
        if (response.ok) {
            console.log("Job created successfully:", result.message);
            document.getElementById("successMessage").innerText = result.message;

            const jobId = result.jobId;
            if (jobId) {
                console.log(`Starting log streaming for Job ID: ${jobId}`);
                fetchCurrentLogs(jobId); // Stream logs for the new job
            } else {
                console.error("Job ID is undefined in the response.");
            }

            fetchQueueStatus(); // Update the queue
        } else {
            showError(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error("Error creating JSON file:", error);
        showError("An error occurred while creating the JSON file.");
    }
}

/**
 * Generate a lipid ID in the format: AA, AB, ..., AZ, BA, ..., ZZ
 * @param {number} index - The current index to generate the ID for
 * @returns {string} The generated lipid ID
 */
function generateLipidId(index) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const firstLetter = letters[Math.floor(index / 26) % 26];
    const secondLetter = letters[index % 26];
    return `${firstLetter}${secondLetter}`;
}


