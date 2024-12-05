// js/moleculeManager.js

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
    const errorField = document.getElementById(`error${moleculeId}`);

    // Clear any existing error message
    errorField.innerText = "";

    // Remove any existing compound database link
    const existingLink = document.getElementById(`compoundDatabaseLink${moleculeId}`);
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
        if (!document.getElementById(`compoundDatabaseLink${moleculeId}`)) {
            const link = document.createElement("a");
            link.href = "https://www.ebi.ac.uk/pdbe-srv/pdbechem/";
            link.target = "_blank";
            link.id = `compoundDatabaseLink${moleculeId}`;
            link.innerText = "Search the Chemical Compound Database";
            sequenceField.appendChild(link);
        }
    } else {
        sequenceField.style.display = "none";
    }
}
function validateSequence(moleculeId) {
    const moleculeType = document.getElementById(`molecule${moleculeId}`).value.toLowerCase();
    const input = document.getElementById(`sequence${moleculeId}`).value.trim();
    const errorField = document.getElementById(`error${moleculeId}`);
    let validPattern;

    if (moleculeType === "protein") {
        validPattern = /^[ACDEFGHIKLMNPQRSTVWY]+$/i; // Valid amino acids
    } else if (moleculeType === "dna") {
        validPattern = /^[ATGC]+$/i; // Valid DNA nucleotides
    } else if (moleculeType === "rna") {
        validPattern = /^[AUGC]+$/i; // Valid RNA nucleotides
    } else if (["ligand", "ion"].includes(moleculeType)) {
        validPattern = /^[A-Za-z0-9]{1,3}$/; // CCD codes: 1-3 alphanumeric characters
    }

    if (validPattern && !validPattern.test(input)) {
        errorField.innerText = `Invalid ${moleculeType} input.`;
    } else {
        errorField.innerText = "";
    }
}


// Function to validate protein sequences
function validateProteinSequence(sequence) {
    // Regular expression matching valid amino acid single-letter codes
    const validAminoAcids = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
    return validAminoAcids.test(sequence);
}
