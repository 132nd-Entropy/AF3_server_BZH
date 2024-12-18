// js/logStreaming.js

let eventSource = null;

export function startServerLogStreaming(jobId) {
    if (eventSource) {
        eventSource.close();
    }

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    const MAX_LINES = 1000;
    eventSource = new EventSource(`/stream-logs?jobId=${jobId}`); // Updated endpoint

    eventSource.onmessage = (event) => {
        const logLine = event.data;

        if (logLine === "[END OF LOG]") {
            // End of log stream handling
            logsDisplay.value += "\n[Log streaming completed.]\n";
            logsDisplay.scrollTop = logsDisplay.scrollHeight;
            eventSource.close();
            eventSource = null;
            return;
        }

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
            logsDisplay.value += "\n[Log stream disconnected.]\n";
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

export function fetchCurrentLogs(jobId) {
    if (!jobId) {
        console.error("No jobId provided for fetching logs.");
        return;
    }

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    // Start streaming logs from the backend
    const eventSource = new EventSource(`/stream-logs?jobId=${jobId}`);
    eventSource.onmessage = (event) => {
        logsDisplay.value += event.data + '\n';
        logsDisplay.scrollTop = logsDisplay.scrollHeight;
    };

    eventSource.onerror = () => {
        console.error("Error in log stream.");
        logsDisplay.value += "\n[Log streaming disconnected.]\n";
        eventSource.close();
    };
}
