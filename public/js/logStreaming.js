let eventSource = null;

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


export function startServerLogStreaming(jobId) {
    if (eventSource) {
        eventSource.close(); // Close any existing stream
    }

    const logsDisplay = document.getElementById("logsDisplay");
    if (!logsDisplay) {
        console.error("Logs display element not found.");
        return;
    }

    eventSource = new EventSource(`/stream-logs?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
        const logLine = event.data;

        if (logLine === '[END OF LOG]') {
            logsDisplay.value += "\n[Log streaming completed.]\n";
            logsDisplay.scrollTop = logsDisplay.scrollHeight;
            eventSource.close();
            eventSource = null;
            return;
        }

        logsDisplay.value += logLine + "\n";

        // Scroll to the bottom of the logs
        logsDisplay.scrollTop = logsDisplay.scrollHeight;
    };

    eventSource.onerror = (err) => {
        console.error("Error receiving server logs:", err);
        logsDisplay.value += "\n[Log stream disconnected.]\n";
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

