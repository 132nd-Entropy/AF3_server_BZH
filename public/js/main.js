// js/main.js

document.addEventListener("DOMContentLoaded", () => {
    addMolecule(); // Adds the initial molecule block dynamically

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



if (currentJob && currentJob.id) {
    fetch(`/get-logs?jobId=${currentJob.id}`)
        .then(response => response.json())
        .then(data => {
            if (data.logs) {
                const logsDisplay = document.getElementById('logsDisplay');
                logsDisplay.value = data.logs.join('\n');
            }
        })
        .catch(error => console.error('Error fetching logs:', error));
}
