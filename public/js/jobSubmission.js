// js/jobSubmission.js

async function createJSONFile() {
    const projectName = document.getElementById("projectName").value.trim();
    if (!projectName) {
        alert("Please enter a Prediction Name.");
        return;
    }

    const moleculeBlocks = document.querySelectorAll(".molecule-block");
    if (moleculeBlocks.length === 0) {
        alert("Please add at least one molecule.");
        return;
    }

    let errorOccurred = false;
    const sequences = [];
    const idLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let moleculeCounter = 0;

    moleculeBlocks.forEach((moleculeBlock, index) => {
        if (errorOccurred) return;

        const moleculeId = moleculeBlock.getAttribute("data-molecule-id");

        // Retrieve elements using moleculeId
        const moleculeTypeElement = document.getElementById(`molecule${moleculeId}`);
        const sequenceElement = document.getElementById(`sequence${moleculeId}`);
        const errorField = document.getElementById(`error${moleculeId}`);

        // Check if elements exist
        if (!moleculeTypeElement || !sequenceElement || !errorField) {
            console.error(`Elements with IDs molecule${moleculeId}, sequence${moleculeId}, or error${moleculeId} not found.`);
            errorOccurred = true;
            return;
        }

        const moleculeType = moleculeTypeElement.value.toLowerCase();
        const input = sequenceElement.value.trim() || null;

        // Validate that the input is provided for certain molecule types
        if (!input) {
            alert(`Please enter input for Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }

        if (errorField.innerText) {
            alert(`Validation error in Molecule ${index + 1}: ${errorField.innerText}`);
            errorOccurred = true;
            return;
        }

        // Assign an ID to the molecule
        const moleculeID = idLetters[moleculeCounter % idLetters.length];
        moleculeCounter++;

        let sequenceObject = {};

        // Build the sequence object based on molecule type
        if (["protein", "dna", "rna"].includes(moleculeType)) {
            // For protein, DNA, RNA
            sequenceObject[moleculeType] = {
                id: moleculeID,
                sequence: input
            };
        } else if (["ligand", "ion"].includes(moleculeType)) {
            // For ligand and ion
            sequenceObject[moleculeType] = {
                id: moleculeID,
                ccdCodes: [input]
            };
        } else {
            alert(`Unsupported molecule type for Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }

        sequences.push(sequenceObject);
    });

    if (errorOccurred) {
        return;
    }

    // Build the final JSON object
    const jsonData = {
        name: projectName,
        sequences: sequences,
        dialect: "alphafold3",
        version: 1,
        modelSeeds: [1]
    };

    // Proceed with the fetch request
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
            document.getElementById("successMessage").innerText = result.message;

            // Start log streaming for this job
            const jobId = result.jobId;
            if (jobId) {
                startServerLogStreaming(jobId);
            } else {
                console.error('Job ID is undefined in the response.');
            }

            // Update the queue status
            fetchQueueStatus();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while creating the JSON file.");
    }
}
