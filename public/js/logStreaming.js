let eventSource = null;

export function startServerLogStreaming(jobId) {
    if (eventSource) {
        eventSource.close(); // Close the previous stream
    }

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    const MAX_LINES = 1000;

    // Ensure the endpoint matches the backend
    eventSource = new EventSource(`/api/logs/stream?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
        const logLine = event.data;

        if (logLine === "[END OF LOG]") {
            // Handle the end of the log stream
            logsDisplay.value += "\n[Log streaming completed.]\n";
            logsDisplay.scrollTop = logsDisplay.scrollHeight;
            eventSource.close();
            eventSource = null;
            return;
        }

        // Append the new log line
        logsDisplay.value += logLine + "\n";

        // Limit displayed logs to MAX_LINES
        const logLines = logsDisplay.value.split("\n");
        if (logLines.length > MAX_LINES) {
            logsDisplay.value = logLines.slice(-MAX_LINES).join("\n");
        }

        // Scroll to the bottom of the logs
        logsDisplay.scrollTop = logsDisplay.scrollHeight;
    };

    eventSource.onerror = (err) => {
        console.error("Error receiving server logs:", err);

        // Append a disconnection message
        logsDisplay.value += "\n[Log stream disconnected.]\n";

        // Close the event source
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
    };

    // Ensure the connection is closed when the page is unloaded
    window.addEventListener("beforeunload", () => {
        if (eventSource) {
            eventSource.close();
        }
    });
}
