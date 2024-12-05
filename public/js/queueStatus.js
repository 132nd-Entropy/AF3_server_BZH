async function fetchQueueStatus() {
    try {
        const response = await fetch("/queue-status");
        if (!response.ok) throw new Error(`Failed to fetch queue status: ${response.statusText}`);

        const data = await response.json();
        console.log('Queue status data:', data);

        document.getElementById("currentJobDisplay").innerHTML = data.isProcessing && data.currentJob
            ? `<p>Currently Processing: <strong>${data.currentJob.filename}</strong></p>`
            : "<p>No job is currently processing.</p>";

        document.getElementById("queueList").innerHTML = data.queue && data.queue.length
            ? `<p><strong>Pending Jobs:</strong></p><ul>${data.queue.map(job => `<li>Position ${job.position}: ${job.filename}</li>`).join("")}</ul>`
            : "<p>No jobs in the queue.</p>";

        document.getElementById("completedJobsList").innerHTML = data.completedJobs && data.completedJobs.length
            ? `<p><strong>Completed Jobs:</strong></p><ul>${data.completedJobs.map(job => `<li>${job.filename} (Finished at: ${new Date(job.finishedAt).toLocaleString()})</li>`).join("")}</ul>`
            : "<p>No completed jobs yet.</p>";
    } catch (error) {
        console.error("Error fetching queue status:", error);
        document.getElementById("currentJobDisplay").innerHTML = "<p>Error fetching queue status.</p>";
        document.getElementById("queueList").innerHTML = "<p>Unable to load queue.</p>";
        document.getElementById("completedJobsList").innerHTML = "<p>Unable to load completed jobs.</p>";
    }
}
