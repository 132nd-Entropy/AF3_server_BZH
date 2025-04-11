function toggleLipidOptions() {
    const checkbox = document.getElementById("addLipidsCheckbox");
    const lipidTypeDropdown = document.getElementById("lipidTypeDropdown");
    const lipidAmountDropdown = document.getElementById("lipidAmountDropdown");

    // Enable or disable dropdowns based on checkbox state
    if (checkbox.checked) {
        lipidTypeDropdown.disabled = false;
        lipidAmountDropdown.disabled = false;
    } else {
        lipidTypeDropdown.disabled = true;
        lipidAmountDropdown.disabled = true;
    }
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
    let moleculeCounter = 0;

    moleculeBlocks.forEach((moleculeBlock, index) => {
        if (errorOccurred) return;

        const moleculeId = moleculeBlock.getAttribute("data-molecule-id");

        const moleculeTypeElement = document.getElementById(`molecule${moleculeId}`);
        const sequenceElement = document.getElementById(`sequence${moleculeId}`);
        const ligandAmountElement = document.getElementById(`ligandAmount${moleculeId}`);
        const ionAmountElement = document.getElementById(`ionAmount${moleculeId}`);
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

        if (["protein", "dna", "rna"].includes(moleculeType)) {
            sequences.push({
                [moleculeType]: {
                    id: moleculeID,
                    sequence: input
                }
            });
        } else if (moleculeType === "ligand") {
            const ligandAmount = parseInt(ligandAmountElement.value.trim(), 10) || 1;
            sequences.push({
                [moleculeType]: {
                    id: moleculeID,
                    ccdCodes: [input],
                    amount: ligandAmount
                }
            });
        } else if (moleculeType === "ion") {
            const ionAmount = parseInt(ionAmountElement.value.trim(), 10) || 1;
            for (let i = 0; i < ionAmount; i++) {
                sequences.push({
                    ion: {
                        id: generateLipidId(moleculeCounter),
                        ccdCodes: [input]
                    }
                });
                moleculeCounter++;
            }
        } else {
            showError(`Unsupported molecule type for Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }
    });  // End of moleculeBlocks.forEach loop

    if (errorOccurred) return;

    // Handle Lipids checkbox
    const addLipidsCheckbox = document.getElementById("addLipidsCheckbox");
    if (addLipidsCheckbox && addLipidsCheckbox.checked) {
        const lipidType = document.getElementById("lipidTypeDropdown").value;
        const lipidAmount = parseInt(document.getElementById("lipidAmountDropdown").value, 10);

        for (let i = 0; i < lipidAmount; i++) {
            sequences.push({
                ligand: {
                    id: generateLipidId(moleculeCounter),
                    ccdCodes: [lipidType]
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
} // <-- Make sure the function ends here!

// Function generateLipidId is good as-is
function generateLipidId(index) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let id = '';
    while (index >= 0) {
        id = letters[index % 26] + id;
        index = Math.floor(index / 26) - 1;
    }
    return id;
}
