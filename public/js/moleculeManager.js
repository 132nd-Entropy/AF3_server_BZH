let moleculeCount = 0;

// Export the addMolecule function
export function addMolecule() {
    // Generate unique molecule ID using Date.now() + molecule count
    const moleculeId = `mol${Date.now()}_${moleculeCount}`;
    moleculeCount++;

    const container = document.getElementById("moleculeContainer");

    const newMolecule = document.createElement("div");
    newMolecule.className = "molecule-block";
    newMolecule.id = `molecule${moleculeId}Block`;
    newMolecule.setAttribute('data-molecule-id', moleculeId);

    newMolecule.innerHTML = `
        <h3>Molecule ${moleculeCount}</h3>
        <label for="molecule${moleculeId}">Molecule Type:</label>
        <select id="molecule${moleculeId}" class="moleculeTypeDropdown">
            <option value="Protein" selected>Protein</option>
            <option value="Ligand">Ligand</option>
            <option value="RNA">RNA</option>
            <option value="DNA">DNA</option>
            <option value="Ion">Ion</option>
        </select>
        <div id="sequenceField${moleculeId}">
            <label for="sequence${moleculeId}">Enter Protein Sequence:</label>
            <textarea id="sequence${moleculeId}" placeholder="Paste protein sequence here..."></textarea>
            <p class="error" id="error${moleculeId}"></p>
        </div>
        <button class="remove-button" data-remove-id="${moleculeId}">Remove Molecule</button>
    `;

    container.appendChild(newMolecule);

    // Add event listeners to the newly created elements
    document.getElementById(`molecule${moleculeId}`).addEventListener("change", function() {
        handleMoleculeTypeChange(moleculeId);
    });

    document.getElementById(`sequence${moleculeId}`).addEventListener("input", function() {
        validateSequence(moleculeId);
    });

    document.querySelector(`[data-remove-id="${moleculeId}"]`).addEventListener("click", function() {
        removeMolecule(moleculeId);
    });
}


// Export removeMolecule and attach to the window for global access
export function removeMolecule(moleculeId) {
    const moleculeBlock = document.getElementById(`molecule${moleculeId}Block`);
    if (moleculeBlock) {
        moleculeBlock.remove();
    }
}
window.removeMolecule = removeMolecule; // Attach globally for inline HTML use

// Export handleMoleculeTypeChange and attach to the window
export function handleMoleculeTypeChange(moleculeId) {
    const moleculeType = document.getElementById(`molecule${moleculeId}`).value;
    const sequenceField = document.getElementById(`sequenceField${moleculeId}`);
    const sequenceLabel = sequenceField.querySelector(`label[for=\"sequence${moleculeId}\"]`);
    const sequenceInput = document.getElementById(`sequence${moleculeId}`);
    const errorField = document.getElementById(`error${moleculeId}`);

    // Clear existing error messages and additional dropdown
    errorField.innerText = "";
    const existingLink = document.getElementById(`compoundDatabaseLink${moleculeId}`);
    if (existingLink) existingLink.remove();

    const existingIonDropdown = document.getElementById(`ionDropdown${moleculeId}`);
    if (existingIonDropdown) existingIonDropdown.remove();

    const existingIonAmountInput = document.getElementById(`ionAmount${moleculeId}`);
    if (existingIonAmountInput) existingIonAmountInput.remove();

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
    } else if (moleculeType === "Ligand") {
        sequenceLabel.innerText = "Enter CCD Code:";
        sequenceInput.placeholder = "Enter Chemical Component Dictionary (CCD) Code...";
        sequenceInput.style.display = "block";

        const link = document.createElement("a");
        link.href = "https://www.ebi.ac.uk/pdbe-srv/pdbechem/";
        link.target = "_blank";
        link.id = `compoundDatabaseLink${moleculeId}`;
        link.innerText = "Search the Chemical Compound Database";
        sequenceField.appendChild(link);
    } else if (moleculeType === "Ion") {
        sequenceLabel.innerText = "Select Ion Type:";
        sequenceInput.style.display = "none";

        const ionDropdown = document.createElement("select");
        ionDropdown.id = `ionDropdown${moleculeId}`;
        ionDropdown.innerHTML = `
            <option value="MG">MG²⁺</option>
            <option value="ZN">ZN²⁺</option>
            <option value="CL">Cl⁻</option>
            <option value="CA">Ca²⁺</option>
            <option value="NA">Na⁺</option>
            <option value="MN">Mn²⁺</option>
            <option value="K">K⁺</option>
            <option value="CU">Cu²⁺</option>
            <option value="CO">Co²⁺</option>
        `;
        sequenceField.appendChild(ionDropdown);

        const ionAmountInput = document.createElement("input");
        ionAmountInput.type = "number";
        ionAmountInput.id = `ionAmount${moleculeId}`;
        ionAmountInput.placeholder = "Amount";
        ionAmountInput.min = "1";
        ionAmountInput.value = "1";
        ionAmountInput.style.marginLeft = "10px";
        sequenceField.appendChild(ionAmountInput);

        ionDropdown.addEventListener("change", () => {
            sequenceInput.value = ionDropdown.value;
        });
        // Store ion count directly as a data attribute for easy retrieval
        ionAmountInput.addEventListener("input", () => {
        ionAmountInput.setAttribute('data-ion-count', ionAmountInput.value);
        });

        // Initialize values
        sequenceInput.value = ionDropdown.value;
        sequenceInput.setAttribute('data-ion-count', ionAmountInput.value);
        sequenceInput.value = ionDropdown.value;
        sequenceInput.style.display = "none"; // Hidden but stores CCD code
    } else {
        sequenceField.style.display = "none";
    }
}
window.handleMoleculeTypeChange = handleMoleculeTypeChange;



// Export validateSequence and attach to the window
export function validateSequence(moleculeId) {
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

export function handleOptionalInputChange() {
    const optionalInputDropdown = document.getElementById("optionalInputDropdown");
    const lipidOptionsContainer = document.getElementById("lipidOptionsContainer");

    if (optionalInputDropdown.value === "addLipids") {
        lipidOptionsContainer.innerHTML = `
            <label for="lipidTypeDropdown">Lipid Type:</label>
            <select id="lipidTypeDropdown">
                <option value="OLA">OLEIC ACID (OLA)</option>
            </select>

            <label for="lipidAmountDropdown">Amount:</label>
            <select id="lipidAmountDropdown">
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="90">90</option>
            </select>
        `;
    } else {
        lipidOptionsContainer.innerHTML = "";
    }
}
window.handleOptionalInputChange = handleOptionalInputChange;


window.validateSequence = validateSequence; // Attach globally for inline HTML use
