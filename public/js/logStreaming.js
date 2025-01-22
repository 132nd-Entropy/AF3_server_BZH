let eventSource = null;
let currentJobId = null;

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
        return;
    }

    if (eventSource) {
        console.log("Stopping previous log stream...");
        eventSource.close();
        eventSource = null;
    }

    console.log(`Connecting to log stream for Job ${jobId}...`);
    currentJobId = jobId;

    // Store the jobId in localStorage for reconnection after page reload
    localStorage.setItem("currentJobId", jobId);

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    logsDisplay.value = `[Connected to log stream for Job ${jobId}]\n`;

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

/**
 * Automatically reconnect to the last running job's log stream.
 */
export function reconnectToPreviousLog() {
    const storedJobId = localStorage.getItem("currentJobId");
    if (storedJobId) {
        console.log(`Reconnecting to logs for stored Job ID: ${storedJobId}`);
        fetchCurrentLogs(storedJobId);
    } else {
        console.log("No previous job log to reconnect.");
    }
}

/**
 * Clear the stored job ID when the job completes or fails.
 */
export function clearStoredJobId() {
    localStorage.removeItem("currentJobId");
    currentJobId = null;
}
