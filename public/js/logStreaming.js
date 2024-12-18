let eventSource = null; // Keep track of the current log stream
let currentJobId = null; // Track the currently streaming job ID

/**
 * Fetch and display logs for a job in the frontend.
 * @param {string} jobId - The ID of the job to fetch logs for.
 */
export function fetchCurrentLogs(jobId) {
    if (!jobId) {
        console.error("No jobId provided for fetching logs.");
        return;
    }

    if (eventSource && currentJobId === jobId) {
        console.log(`Already connected to log stream for Job ${jobId}.`);
        return; // No need to reconnect if the job ID is the same
    }

    if (eventSource) {
        console.log("Stopping previous log stream...");
        eventSource.close(); // Close the previous stream
        eventSource = null;
    }

    console.log(`Connecting to log stream for Job ${jobId}...`);
    currentJobId = jobId; // Update the currently streaming job ID

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    // Clear previous logs
    logsDisplay.value = `[Connected to log stream for Job ${jobId}]\n`;

    // Start a new EventSource for the given job
    eventSource = new EventSource(`/stream-logs?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
        const logLine = event.data;
        logsDisplay.value += logLine + "\n";
        logsDisplay.scrollTop = logsDisplay.scrollHeight;
    };

    eventSource.onerror = () => {
        console.error("Error receiving server logs. Reconnecting in 5 seconds...");
        logsDisplay.value += "\n[Log stream disconnected. Attempting to reconnect...]\n";
        eventSource.close();
        eventSource = null;

        // Retry the connection after 5 seconds
        setTimeout(() => fetchCurrentLogs(jobId), 5000);
    };

    // Ensure the connection is closed when the page is unloaded
    window.addEventListener("beforeunload", () => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    });
}
