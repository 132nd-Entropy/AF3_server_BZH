const queueController = require('./queueController');

function createJob(req, res) {
    const { filename, content } = req.body;
    if (!filename || !content) {
        return res.status(400).json({ error: 'Invalid job data.' });
    }
    const jobId = Date.now().toString();
    const job = {
        id: jobId,
        filename,
        content,
        status: 'queued',
    };
    queueController.enqueueJob(job);
    res.json({ message: 'Job queued successfully.', jobId });
}

function processJob(job) {
    try {
        // Placeholder for any job pre-processing logic if needed
    } catch (error) {
        console.error(`Failed to process job: ${job.id}. Error: ${error.message}`);
        job.status = 'failed';
        throw error;
    }
}

module.exports = {
    createJob,
    processJob,
};
