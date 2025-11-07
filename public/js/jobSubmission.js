import { fetchQueueStatus } from './queueStatus.js';  // removed fetchCurrentLogs import

function showError(message) {
   const msgElem = document.getElementById("successMessage");
   if (msgElem) {
      msgElem.innerText = message;
      msgElem.style.color = "red";
   } else {
      alert(message); // fallback
   }
}

export async function createJSONFile(event) {
   // Prevent accidental form reloads (important!)
   if (event) event.preventDefault();

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
      const input = (sequenceElement.value || "").trim() || null;

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

      if (["protein", "dna", "rna"].includes(moleculeType)) {
         const moleculeID = generateLipidId(moleculeCounter++);
         sequences.push({
            [moleculeType]: { id: moleculeID, sequence: input }
         });

      } else if (moleculeType === "ligand") {
         // ✅ AF3: no "amount" key. Repeat entries instead.
         const times = parseInt((ligandAmountElement?.value || "").trim(), 10) || 1;
         for (let i = 0; i < times; i++) {
            const moleculeID = generateLipidId(moleculeCounter++);
            sequences.push({
               ligand: {
                  id: moleculeID,
                  ccdCodes: [input]   // e.g., "GDP"
               }
            });
         }

      } else if (moleculeType === "ion") {
         // ✅ Treat ions as ligands; repeat entries; no "amount" key.
         const times = parseInt((ionAmountElement?.value || "").trim(), 10) || 1;
         for (let i = 0; i < times; i++) {
            const moleculeID = generateLipidId(moleculeCounter++);
            sequences.push({
               ligand: {
                  id: moleculeID,
                  ccdCodes: [input]   // e.g., "MG", "NA", "CL"
               }
            });
         }

      } else {
         showError(`Unsupported molecule type for Molecule ${index + 1}.`);
         errorOccurred = true;
         return;
      }
   });

   if (errorOccurred) return;

   // Optional lipid section (already repeats entries correctly)
   const lipidTypeDropdown = document.getElementById("lipidTypeDropdown");
   const lipidAmountDropdown = document.getElementById("lipidAmountDropdown");
   if (lipidTypeDropdown && lipidAmountDropdown) {
      const lipidType = lipidTypeDropdown.value;
      const lipidAmount = parseInt(lipidAmountDropdown.value, 10) || 0;
      for (let i = 0; i < lipidAmount; i++) {
         const moleculeID = generateLipidId(moleculeCounter++);
         sequences.push({
            ligand: {
               id: moleculeID,
               ccdCodes: [lipidType]
            }
         });
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
         headers: { "Content-Type": "application/json" },
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
            console.log(`✅ Job queued: ${jobId}`);
            try { localStorage.setItem('currentJobId', jobId); } catch {}
         }

         await fetchQueueStatus(); // Refresh queue info
      } else {
         showError(`Error: ${result.error}`);
      }
   } catch (error) {
      console.error("Error creating JSON file:", error);
      showError("An error occurred while creating the JSON file.");
   }
}

// unchanged
function generateLipidId(index) {
   const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
   let id = '';
   while (index >= 0) {
      id = letters[index % 26] + id;
      index = Math.floor(index / 26) - 1;
   }
   return id;
}
