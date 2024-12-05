// app.js

const express = require('express');
const app = express();
const queueController = require('./controllers/queueController');
const logController = require('./controllers/logController');

app.use(express.json());
app.get('/server-logs', logController.streamServerLogs);

// Serve frontend files if needed
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send('Welcome to the Job Queue Server!');
});

// Route to create a new job
app.post('/create-json', (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Invalid job data.' });
    }

    const jobId = Date.now().toString(); // Consider using UUIDs for production
    const job = {
        id: jobId,
        filename,
        content,
        status: 'queued',
    };

    // Enqueue the job
    queueController.enqueueJob(job);

    res.json({ message: 'Job queued successfully.', jobId });
});

// **Add the '/queue-status' route here**
app.get('/queue-status', (req, res) => {
    const allJobs = queueController.allJobs; // Access allJobs map

    // Check if allJobs is defined and is a Map
    if (!allJobs || typeof allJobs.values !== 'function') {
        console.error('allJobs is not a valid Map');
        return res.status(500).json({ error: 'Internal server error' });
    }

    // Convert the allJobs Map into an array of job info
    const jobsArray = Array.from(allJobs.values()).map(job => ({
        id: job.id,
        filename: job.filename,
        status: job.status,
    }));

    res.json({ jobs: jobsArray });
});

// Start the server
const PORT = process.env.PORT || 49200;
app.listen(PORT, '129.206.154.125', () => {
    console.log(`Server running at http://129.206.154.125:${PORT}`);
});
