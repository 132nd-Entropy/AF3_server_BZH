const { v4: uuidv4 } = require('uuid');
const express = require('express');
const jsonGenerator = require('./controllers/jsonGenerator');
const queueController = require('./controllers/queueController');
const logController = require('./controllers/logController');
const dockerService = require('./services/dockerService');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/api/logs/stream', logController.streamServerLogs);


app.get('/reconnect-logs', (req, res) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
        return res.status(400).json({ error: 'Invalid or missing Job ID.' });
    }

    const jobLogEmitter = dockerService.getJobLogEmitter(jobId);

    if (jobLogEmitter) {
        res.status(200).json({ message: `Reconnected to logs for job ${jobId}` });
    } else {
        res.status(404).json({ error: 'No logs found for this job.' });
    }
});

app.get('/get-logs', (req, res) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
        return res.status(400).json({ error: 'Invalid or missing Job ID.' });
    }

    const logs = dockerService.getPersistentLogs(jobId);

    if (!logs || logs.length === 0) {
        return res.status(404).json({ error: 'No logs found for this job.' });
    }

    res.json({ logs });
});

app.post('/create-json', async (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Invalid job data.' });
    }

    try {
        const filePath = await jsonGenerator.generateJSONFile(filename, content);
        console.log(`JSON file created at: ${filePath}`);

        const jobId = uuidv4();
        const job = { id: jobId, filename, content, status: 'queued' };

        queueController.enqueueJob(job);

        res.json({ message: 'Job queued successfully.', jobId, filePath });
    } catch (error) {
        console.error(`Failed to create JSON file: ${error.message}`);
        res.status(500).json({ error: 'Failed to create JSON file.' });
    }
});

app.get('/queue-status', (req, res) => {
    const status = queueController.getQueueStatus();
    res.json(status);
});

// Catch-All for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Export for testing
module.exports = app;

// Start the server
if (require.main === module) {
    const PORT = process.env.PORT || 49200;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running at http://127.0.0.1:${PORT}`);
    });
}
