const { v4: uuidv4 } = require('uuid');
const express = require('express');
const jsonGenerator = require('./controllers/jsonGenerator');
const queueController = require('./controllers/queueController');
const logController = require('./controllers/logController.js');

const app = express();
const path = require('path');

const dockerService = require('./services/dockerService'); // Ensure correct path

app.use(express.json());

// Serve frontend files if needed
app.use(express.static('public'));


// Route for streaming server logs
app.get('/server-logs', logController.streamServerLogs);

app.get('/reconnect-logs', (req, res) => {
    const { jobId } = req.query;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }

    const jobLogEmitter = dockerService.getJobLogEmitter(jobId);

    if (jobLogEmitter) {
        res.status(200).json({ message: `Reconnected to logs for job ${jobId}` });
    } else {
        res.status(404).json({ error: 'No logs found for this job.' });
    }
});

app.get('/', (req, res) => {
    console.log(`NODE_ENV is: ${process.env.NODE_ENV}`); // Debugging log
    if (process.env.NODE_ENV === 'test') {
        return res.send('Welcome to the Job Queue Server!');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/get-logs', (req, res) => {
    const { jobId } = req.query;

    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }

    const logs = dockerService.getPersistentLogs(jobId);

    if (!logs.length) {
        return res.status(404).json({ error: 'No logs found for this job.' });
    }

    res.json({ logs });
});


app.use(express.static('public'));


// Route to create a new job

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

        // Enqueue the job via the queue controller
        queueController.enqueueJob(job);

        res.json({ message: 'Job queued successfully.', jobId, filePath });
    } catch (error) {
        console.error(`Failed to create JSON file: ${error.message}`);
        res.status(500).json({ error: 'Failed to create JSON file.' });
    }
});


// Route to check job queue status
app.get('/queue-status', (req, res) => {
    const status = queueController.getQueueStatus();
    console.log('Queue Status Response:', JSON.stringify(status, null, 2)); // Debugging log
    res.json(status);
});

// Catch-all handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Export the app for testing
module.exports = app;

// Start the server in runtime environment
if (require.main === module) {
    const PORT = process.env.PORT || 49200;
    app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://129.206.154.125:${PORT}`);
    });
}
