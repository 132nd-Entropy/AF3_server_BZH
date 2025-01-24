const { v4: uuidv4 } = require('uuid');
const express = require('express');
const cors = require('cors');
const jsonGenerator = require('./controllers/jsonGenerator');
const queueController = require('./controllers/queueController');
const logController = require('./controllers/logController');
const dockerService = require('./services/dockerService');
const path = require('path');
const app = express();




// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.get('/stream-logs', logController.streamServerLogs);


app.get('/reconnect-logs', (req, res) => {
    const { jobId } = req.query;

    if (!jobId || typeof jobId !== 'string' || !jobId.trim()) {
        return res.status(400).json({ error: 'Invalid or missing Job ID.' });
    }

    const jobLogEmitter = dockerService.getJobLogEmitter(jobId);

    if (jobLogEmitter) {
        logController.tailDockerLogs(jobId, `${jobId}.log`);  // Ensure log streaming starts
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
        const jobId = uuidv4();
        const filePath = await jsonGenerator.generateJSONFile(filename, content);

        console.log(`[${new Date().toISOString()}] JSON file created at: ${filePath}`);

        queueController.enqueueJob({ id: jobId, filename, content, status: 'queued' });

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
// Start the server
const PORT = process.env.PORT || 49200;
app.listen(PORT, '129.206.154.125', () => {
    console.log(`Server running at http://129.206.154.125:${PORT}`);
});

