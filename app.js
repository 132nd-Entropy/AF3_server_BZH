const { v4: uuidv4 } = require('uuid');
const express = require('express');

const queueController = require('./controllers/queueController');
const logController = require('./controllers/logController.js');
const app = express();
const path = require('path');

app.use(express.json());

// Serve frontend files if needed
app.use(express.static('public'));

// Route for streaming server logs
app.get('/server-logs', logController.streamServerLogs);

app.get('/', (req, res) => {
    console.log(`NODE_ENV is: ${process.env.NODE_ENV}`); // Debugging log
    if (process.env.NODE_ENV === 'test') {
        return res.send('Welcome to the Job Queue Server!');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(express.static('public'));


// Route to create a new job
app.post('/create-json', (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: 'Invalid job data.' });
    }

    const jobId = uuidv4(); // Generate unique job ID using UUID
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

// Route to check job queue status
app.get('/queue-status', (req, res) => {
    const allJobs = queueController.allJobs;

    const jobsArray = allJobs && typeof allJobs.values === 'function'
        ? Array.from(allJobs.values()).map(job => ({
              id: job.id,
              filename: job.filename,
              status: job.status,
          }))
        : [];

    res.json({ jobs: jobsArray });
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
    app.listen(PORT, '129.206.154.125', () => {
        console.log(`Server running at http://129.206.154.125:${PORT}`);
    });
}
