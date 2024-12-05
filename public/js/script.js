// js/script.js

let moleculeCount = 0;

function addMolecule() {
    const moleculeId = Date.now();
    moleculeCount++;
    const container = document.getElementById("moleculeContainer");

    const newMolecule = document.createElement("div");
    newMolecule.className = "molecule-block";
    newMolecule.id = `molecule${moleculeId}Block`;
    newMolecule.setAttribute('data-molecule-id', moleculeId);
    newMolecule.innerHTML = `
        <h3>Molecule ${moleculeCount}</h3>
        <label for="molecule${moleculeId}">Molecule Type:</label>
        <select id="molecule${moleculeId}" onchange="handleMoleculeTypeChange(${moleculeId})">
            <option value="Protein" selected>Protein</option>
            <option value="Ligand">Ligand</option>
            <option value="RNA">RNA</option>
            <option value="DNA">DNA</option>
            <option value="Ion">Ion</option>
        </select>
        <div id="sequenceField${moleculeId}">
            <label for="sequence${moleculeId}">Enter Protein Sequence:</label>
            <textarea id="sequence${moleculeId}" placeholder="Paste protein sequence here..." oninput="validateSequence(${moleculeId})"></textarea>
            <p class="error" id="error${moleculeId}"></p>
        </div>
        <button class="remove-button" onclick="removeMolecule(${moleculeId})">Remove Molecule</button>
    `;

    container.appendChild(newMolecule);
}


function removeMolecule(moleculeId) {
    const moleculeBlock = document.getElementById(`molecule${moleculeId}Block`);
    if (moleculeBlock) {
        moleculeBlock.remove();
    }
}


function handleMoleculeTypeChange(moleculeId) {
    const moleculeType = document.getElementById(`molecule${moleculeId}`).value;
    const sequenceField = document.getElementById(`sequenceField${moleculeId}`);
    const sequenceLabel = sequenceField.querySelector(`label[for="sequence${moleculeId}"]`);
    const sequenceInput = document.getElementById(`sequence${moleculeId}`);
    const errorField = document.getElementById(`error${moleculeId}`);;

    // Clear any existing error message
    errorField.innerText = "";

    // Remove any existing compound database link
    const existingLink = document.getElementById(`compoundDatabaseLink${moleculeId}`); // Corrected
    if (existingLink) {
        existingLink.remove();
    }

    if (moleculeType === "Protein") {
        sequenceLabel.innerText = "Enter Protein Sequence:";
        sequenceInput.placeholder = "Paste protein sequence here...";
        sequenceInput.style.display = "block";
    } else if (moleculeType === "RNA") {
        sequenceLabel.innerText = "Enter RNA Sequence:";
        sequenceInput.placeholder = "Paste RNA nucleotide sequence here...";
        sequenceInput.style.display = "block";
    } else if (moleculeType === "DNA") {
        sequenceLabel.innerText = "Enter DNA Sequence:";
        sequenceInput.placeholder = "Paste DNA nucleotide sequence here...";
        sequenceInput.style.display = "block";
    } else if (moleculeType === "Ligand" || moleculeType === "Ion") {
        sequenceLabel.innerText = "Enter CCD Code:";
        sequenceInput.placeholder = "Enter Chemical Component Dictionary (CCD) Code...";
        sequenceInput.style.display = "block";

        // Add compound database link
        if (!document.getElementById(`compoundDatabaseLink${moleculeId}`)) { // Corrected
            const link = document.createElement("a");
            link.href = "https://www.ebi.ac.uk/pdbe-srv/pdbechem/";
            link.target = "_blank";
            link.id = `compoundDatabaseLink${moleculeId}`; // Corrected
            link.innerText = "Search the Chemical Compound Database";
            sequenceField.appendChild(link);
        }
    } else {
        sequenceField.style.display = "none";
    }
}

function validateSequence(moleculeId) {
    const moleculeType = document.getElementById(`molecule${moleculeId}`).value;
    const input = document.getElementById(`sequence${moleculeId}`).value.trim();
    const errorField = document.getElementById(`error${moleculeId}`);
    let validPattern;

    if (moleculeType === "Protein") {
        validPattern = /^[ARNDCEQGHILKMFPSTWYV]+$/i; // Valid amino acids
    } else if (moleculeType === "DNA") {
        validPattern = /^[ATGC]+$/i; // Valid DNA nucleotides
    } else if (moleculeType === "RNA") {
        validPattern = /^[AUGC]+$/i; // Valid RNA nucleotides
    } else if (moleculeType === "Ligand" || moleculeType === "Ion") {
        validPattern = /^[A-Za-z0-9]+$/i; // CCD codes: alphanumeric
    }

    if (validPattern && !input.match(validPattern)) {
        errorField.innerText = `Invalid ${moleculeType} input.`;
    } else {
        errorField.innerText = "";
    }
}

async function createJSONFile() {
    const projectName = document.getElementById("projectName").value.trim();
    if (!projectName) {
        alert("Please enter a Project Name.");
        return;
    }

    const molecules = [];
    const moleculeBlocks = document.querySelectorAll(".molecule-block");
    let errorOccurred = false;

    moleculeBlocks.forEach((moleculeBlock, index) => {
        if (errorOccurred) return;

        const moleculeId = moleculeBlock.getAttribute('data-molecule-id');

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

        const moleculeType = moleculeTypeElement.value;
        const sequence = sequenceElement.value.trim() || null;

        // Validate that the sequence is provided for certain molecule types
        if ((moleculeType === "Protein" || moleculeType === "RNA" || moleculeType === "DNA") && !sequence) {
            alert(`Please enter a sequence for Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }

        if (errorField.innerText) {
            alert(`Validation error in Molecule ${index + 1}.`);
            errorOccurred = true;
            return;
        }

        // Validate that the sequence is a valid protein sequence
        if (moleculeType === "Protein" && !validateProteinSequence(sequence)) {
            alert(`Invalid protein sequence for Molecule ${index + 1}. Please enter a valid sequence.`);
            errorOccurred = true;
            return;
        }

        molecules.push({
            sequence: sequence,
            description: `Molecule ${index + 1}`
            // Removed the 'type' key as it's not expected by AlphaFold 3
        });
    });

    if (errorOccurred) {
        return;
    }

    // Proceed with the fetch request
    try {
        const response = await fetch("/create-json", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                filename: projectName,
                content: molecules, // Send the array directly without wrapping it in an object
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


// Add this function to validate protein sequences
function validateProteinSequence(sequence) {
    // Regular expression matching valid amino acid single-letter codes
    const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
    return validAminoAcids.test(sequence);
}



async function fetchQueueStatus() {
    try {
        const response = await fetch("/queue-status");
        if (!response.ok) throw new Error(`Failed to fetch queue status: ${response.statusText}`);

        const data = await response.json();

        document.getElementById("currentJobDisplay").innerHTML = data.isProcessing && data.currentJob
    ? `<p>Currently Processing: <strong>${data.currentJob.fileName}</strong></p>`
    : "<p>No job is currently processing.</p>";

        document.getElementById("queueList").innerHTML = data.queue.length
            ? `<p><strong>Pending Jobs:</strong></p><ul>${data.queue.map(job => `<li>Position ${job.position}: ${job.fileName}</li>`).join("")}</ul>`
            : "<p>No jobs in the queue.</p>";

        document.getElementById("completedJobsList").innerHTML = data.completedJobs.length
            ? `<p><strong>Completed Jobs:</strong></p><ul>${data.completedJobs.map(job => `<li>${job.fileName} (Finished at: ${new Date(job.finishedAt).toLocaleString()})</li>`).join("")}</ul>`
            : "<p>No completed jobs yet.</p>";
    } catch (error) {
        console.error("Error fetching queue status:", error);
        document.getElementById("currentJobDisplay").innerHTML = "<p>Error fetching queue status.</p>";
        document.getElementById("queueList").innerHTML = "<p>Unable to load queue.</p>";
        document.getElementById("completedJobsList").innerHTML = "<p>Unable to load completed jobs.</p>";
    }
}

let eventSource = null;

function startServerLogStreaming(jobId) {
    if (eventSource) {
        eventSource.close();
    }

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    const MAX_LINES = 1000;
    eventSource = new EventSource(`/server-logs?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
        const logLine = event.data;

        logsDisplay.value += logLine + "\n";

        // Limit to the last MAX_LINES
        const logLines = logsDisplay.value.split("\n");
        if (logLines.length > MAX_LINES) {
            logsDisplay.value = logLines.slice(-MAX_LINES).join("\n");
        }

        logsDisplay.scrollTop = logsDisplay.scrollHeight;
    };

    eventSource.onerror = (err) => {
    console.error("Error receiving server logs:", err);
    if (logsDisplay) {
        logsDisplay.value += "\n[Log stream disconnected.]";
    }
    if (eventSource) {
        eventSource.close();
        eventSource = null;
    }
};


    window.addEventListener("beforeunload", () => {
        if (eventSource) {
            eventSource.close();
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    addMolecule();
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

    fetchQueueStatus();
    setInterval(fetchQueueStatus, 5000); // Poll every 5 seconds
});

