// js/logStreaming.js

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
